CREATE TABLE "resource_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by" TEXT,
    "granted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    "source_application_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "resource_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resource_grants_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "resource_applications" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "resource_grants_resource_type_resource_id_idx" ON "resource_grants"("resource_type", "resource_id");
CREATE INDEX "resource_grants_user_id_revoked_at_idx" ON "resource_grants"("user_id", "revoked_at");
CREATE INDEX "resource_grants_source_application_id_idx" ON "resource_grants"("source_application_id");

INSERT INTO "resource_grants" (
    "id",
    "resource_type",
    "resource_id",
    "user_id",
    "granted_by",
    "granted_at",
    "revoked_at",
    "source_application_id",
    "created_at",
    "updated_at"
)
SELECT
    lower(hex(randomblob(16))),
    "ra"."resource_type",
    "ra"."resource_id",
    "ra"."user_id",
    NULL,
    CURRENT_TIMESTAMP,
    NULL,
    "ra"."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "resource_applications" AS "ra"
INNER JOIN "users" AS "u"
    ON "u"."id" = "ra"."user_id"
LEFT JOIN "skills" AS "s"
    ON "ra"."resource_type" = 'skill'
   AND "s"."id" = "ra"."resource_id"
LEFT JOIN "mcps" AS "m"
    ON "ra"."resource_type" = 'mcp'
   AND "m"."id" = "ra"."resource_id"
WHERE "ra"."status" = 'approved'
  AND "u"."is_active" = 1
  AND (
    ("ra"."resource_type" = 'skill' AND "s"."id" IS NOT NULL AND "s"."is_active" = 1)
    OR
    ("ra"."resource_type" = 'mcp' AND "m"."id" IS NOT NULL AND "m"."is_active" = 1)
  );
