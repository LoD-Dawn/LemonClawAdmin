This folder stores the original PostgreSQL-era Prisma migration history that shipped with the project before the datasource was switched to SQLite.

Those migrations are preserved for reference only and are intentionally excluded from `prisma/migrations`, because Prisma validates the active migration history against the current datasource provider.

The active migration history now starts from `prisma/migrations/20260323191000_sqlite_baseline`, which is a SQLite baseline generated from the current Prisma schema.
