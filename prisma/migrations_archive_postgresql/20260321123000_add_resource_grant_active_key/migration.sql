ALTER TABLE "resource_grants" ADD COLUMN "active_key" TEXT;

WITH ranked_active_grants AS (
    SELECT
        "id",
        "resource_type" || ':' || "resource_id" || ':' || "user_id" AS "computed_active_key",
        ROW_NUMBER() OVER (
            PARTITION BY "resource_type", "resource_id", "user_id"
            ORDER BY "granted_at" DESC, "created_at" DESC, "id" DESC
        ) AS "grant_rank"
    FROM "resource_grants"
    WHERE "revoked_at" IS NULL
)
UPDATE "resource_grants"
SET
    "active_key" = CASE
        WHEN EXISTS (
            SELECT 1
            FROM "ranked_active_grants"
            WHERE "ranked_active_grants"."id" = "resource_grants"."id"
              AND "ranked_active_grants"."grant_rank" = 1
        ) THEN (
            SELECT "computed_active_key"
            FROM "ranked_active_grants"
            WHERE "ranked_active_grants"."id" = "resource_grants"."id"
        )
        ELSE NULL
    END,
    "revoked_at" = CASE
        WHEN EXISTS (
            SELECT 1
            FROM "ranked_active_grants"
            WHERE "ranked_active_grants"."id" = "resource_grants"."id"
              AND "ranked_active_grants"."grant_rank" > 1
        ) THEN COALESCE("resource_grants"."revoked_at", CURRENT_TIMESTAMP)
        ELSE "resource_grants"."revoked_at"
    END;

CREATE UNIQUE INDEX "resource_grants_active_key_key" ON "resource_grants"("active_key");
