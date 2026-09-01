function isPostgresUrl(value?: string | null) {
  const url = value?.trim() ?? ""

  return url.startsWith("postgresql://") || url.startsWith("postgres://")
}

export function resolveSchedulerDatabaseUrl(options: {
  databaseUrl?: string | null
  nodeEnv?: string | null
  schedulerUrl?: string | null
}) {
  if (isPostgresUrl(options.schedulerUrl)) {
    return options.schedulerUrl!.trim()
  }

  if (options.nodeEnv === "development" && isPostgresUrl(options.databaseUrl)) {
    return options.databaseUrl!.trim()
  }

  return null
}
