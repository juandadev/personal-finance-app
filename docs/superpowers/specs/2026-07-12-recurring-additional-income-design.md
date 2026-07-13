# Recurring Additional Income Design

## Goal

Allow a user-created additional-income forecast item to repeat monthly from its
selected start month through each later month in the rolling 13-month forecast.

## Scope

- Extend the existing forecast-adjustment recurrence model; do not introduce a
  new income type or change the default monthly-income setting.
- Make the existing `Repeat Every Month` control available for both additional
  income and planned outflow items in the Add and Edit Forecast Item dialog.
- Keep one-time additional income available and unchanged by default.

## User Experience

- An additional-income item retains its name, amount, and selected start month.
- When `Repeat Every Month` is selected, the item is included in its start
  month and every later forecast month.
- If its start month is the current month, it contributes to the current
  month's pending additional-income bridge and activity list.
- Each projected occurrence remains a pending, user-created adjustment. It
  does not create transactions or modify actual balances.
- Editing or deleting the source item updates or removes all of its projected
  occurrences.
- The default monthly-income setting remains a separate, unlabeled forecast
  baseline that starts with the first future month.

## Data and Calculation

`cash_forecast_adjustments.recurrence` already has `once` and `monthly` values.
Both `additional_income` and `planned_outflow` may use either value.

- A one-time adjustment applies only when
  `forecast_period = adjustment.start_period`.
- A monthly adjustment applies when
  `forecast_period >= adjustment.start_period`.
- The forecast engine adds applicable additional-income adjustments to monthly
  income and emits their per-month activity rows.

Database and server validation must permit both recurrence values for each
adjustment kind. The client form maps the shared repeat control to that
recurrence value for both kinds.

## Error Handling and Compatibility

- Existing additional-income records remain one-time because they already store
  `recurrence = once`.
- Existing recurring planned outflows keep their behavior.
- Validation still requires a non-empty label, a positive safe money amount,
  and a valid forecast period.

## Testing

- Add forecast-engine coverage that recurring additional income appears in its
  selected month and every later forecast month.
- Preserve coverage that one-time additional income appears only once.
- Cover current-month pending-income totals for a recurring income item that
  starts in the current period.
- Cover server validation for `additional_income` with both recurrence values.
- Verify dialog create and edit submissions map the repeat control correctly.
