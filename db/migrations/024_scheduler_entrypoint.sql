-- The scheduler credential may execute one audited operation and cannot read or
-- mutate finance tables directly.
DROP POLICY IF EXISTS profiles_cron_job ON profiles;
DROP POLICY IF EXISTS budgets_cron_job ON budgets;
DROP POLICY IF EXISTS budget_transaction_assignments_cron_job
  ON budget_transaction_assignments;
DROP POLICY IF EXISTS monthly_report_runs_cron_job ON monthly_report_runs;
DROP POLICY IF EXISTS budget_monthly_snapshots_cron_job
  ON budget_monthly_snapshots;
DROP POLICY IF EXISTS categories_monthly_close ON categories;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM personal_finance_scheduler;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM personal_finance_scheduler;
REVOKE EXECUTE ON FUNCTION app.current_user_id()
  FROM personal_finance_scheduler;
REVOKE EXECUTE ON FUNCTION app.is_cron_job()
  FROM personal_finance_app, personal_finance_scheduler;

CREATE OR REPLACE FUNCTION app.close_monthly_budgets(
  p_period text,
  p_next_period text
)
RETURNS TABLE (
  users_checked integer,
  users_closed integer,
  users_skipped integer,
  snapshots_created integer,
  budgets_copied integer,
  failure_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id text;
  v_run_id uuid;
  v_snapshots integer;
  v_budgets integer;
BEGIN
  IF p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR p_next_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR p_next_period <> pg_catalog.to_char(
      pg_catalog.to_date(p_period || '-01', 'YYYY-MM-DD') + interval '1 month',
      'YYYY-MM'
    )
  THEN
    RAISE EXCEPTION 'Invalid monthly close period.'
      USING ERRCODE = '22023';
  END IF;

  users_checked := 0;
  users_closed := 0;
  users_skipped := 0;
  snapshots_created := 0;
  budgets_copied := 0;
  failure_count := 0;

  FOR v_user_id IN
    SELECT DISTINCT budget.user_id
    FROM public.budgets AS budget
    WHERE budget.period = p_period
    ORDER BY budget.user_id
  LOOP
    users_checked := users_checked + 1;

    IF EXISTS (
      SELECT 1
      FROM public.monthly_report_runs AS report
      WHERE report.user_id = v_user_id
        AND report.module = 'budgets'
        AND report.period = p_period
        AND report.status = 'completed'
    ) THEN
      users_skipped := users_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.monthly_report_runs (
        user_id,
        module,
        period,
        status,
        started_at,
        completed_at,
        error_message
      )
      VALUES (
        v_user_id,
        'budgets',
        p_period,
        'running',
        pg_catalog.now(),
        NULL,
        NULL
      )
      ON CONFLICT (user_id, module, period)
      DO UPDATE SET
        status = 'running',
        started_at = pg_catalog.now(),
        completed_at = NULL,
        error_message = NULL
      RETURNING id INTO v_run_id;

      INSERT INTO public.budget_monthly_snapshots (
        user_id,
        monthly_report_run_id,
        period,
        source_budget_id,
        category_id,
        category_name,
        theme_color,
        limit_cents,
        spent_cents,
        free_cents,
        over_cents,
        status,
        assigned_transaction_count
      )
      SELECT
        budget_rows.user_id,
        v_run_id,
        budget_rows.period,
        budget_rows.source_budget_id,
        budget_rows.category_id,
        budget_rows.category_name,
        budget_rows.theme_color,
        budget_rows.limit_cents,
        budget_rows.spent_cents,
        CASE
          WHEN budget_rows.spent_cents > budget_rows.limit_cents
            AND budget_rows.limit_cents > 0
          THEN 0
          ELSE GREATEST(
            budget_rows.limit_cents - budget_rows.spent_cents,
            0
          )
        END,
        CASE
          WHEN budget_rows.spent_cents > budget_rows.limit_cents
            AND budget_rows.limit_cents > 0
          THEN budget_rows.spent_cents - budget_rows.limit_cents
          ELSE 0
        END,
        CASE
          WHEN budget_rows.spent_cents > budget_rows.limit_cents
            AND budget_rows.limit_cents > 0
          THEN 'over_budget'
          ELSE 'within_budget'
        END,
        budget_rows.assigned_transaction_count
      FROM (
        SELECT
          budget.user_id,
          budget.period,
          budget.id AS source_budget_id,
          budget.category_id,
          category.name AS category_name,
          budget.theme_color,
          budget.limit_cents,
          COALESCE(
            pg_catalog.sum(assignment.assigned_amount_cents),
            0
          )::integer AS spent_cents,
          pg_catalog.count(assignment.id)::integer
            AS assigned_transaction_count
        FROM public.budgets AS budget
        JOIN public.categories AS category
          ON category.user_id = budget.user_id
          AND category.id = budget.category_id
        LEFT JOIN public.budget_transaction_assignments AS assignment
          ON assignment.user_id = budget.user_id
          AND assignment.budget_id = budget.id
        WHERE budget.user_id = v_user_id
          AND budget.period = p_period
        GROUP BY
          budget.user_id,
          budget.period,
          budget.id,
          budget.category_id,
          category.name,
          budget.theme_color,
          budget.limit_cents
      ) AS budget_rows
      ON CONFLICT (user_id, period, source_budget_id) DO NOTHING;

      GET DIAGNOSTICS v_snapshots = ROW_COUNT;

      INSERT INTO public.budgets (
        user_id,
        category_id,
        period,
        limit_cents,
        monthly_voucher_coverage_cents,
        theme_color
      )
      SELECT
        budget.user_id,
        budget.category_id,
        p_next_period,
        budget.limit_cents,
        budget.monthly_voucher_coverage_cents,
        budget.theme_color
      FROM public.budgets AS budget
      WHERE budget.user_id = v_user_id
        AND budget.period = p_period
      ON CONFLICT (user_id, category_id, period) DO NOTHING;

      GET DIAGNOSTICS v_budgets = ROW_COUNT;

      UPDATE public.monthly_report_runs
      SET status = 'completed',
          completed_at = pg_catalog.now(),
          error_message = NULL
      WHERE user_id = v_user_id
        AND id = v_run_id;

      users_closed := users_closed + 1;
      snapshots_created := snapshots_created + v_snapshots;
      budgets_copied := budgets_copied + v_budgets;
    EXCEPTION WHEN OTHERS THEN
      failure_count := failure_count + 1;

      BEGIN
        INSERT INTO public.monthly_report_runs (
          user_id,
          module,
          period,
          status,
          started_at,
          completed_at,
          error_message
        )
        VALUES (
          v_user_id,
          'budgets',
          p_period,
          'failed',
          pg_catalog.now(),
          pg_catalog.now(),
          'Scheduled monthly close failed.'
        )
        ON CONFLICT (user_id, module, period)
        DO UPDATE SET
          status = 'failed',
          completed_at = pg_catalog.now(),
          error_message = 'Scheduled monthly close failed.'
        WHERE monthly_report_runs.status <> 'completed';
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END LOOP;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION app.close_monthly_budgets(text, text) FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO personal_finance_scheduler;
GRANT EXECUTE ON FUNCTION app.close_monthly_budgets(text, text)
  TO personal_finance_scheduler;
