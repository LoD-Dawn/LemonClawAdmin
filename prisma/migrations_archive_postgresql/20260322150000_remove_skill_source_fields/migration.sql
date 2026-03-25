PRAGMA foreign_keys=OFF;

CREATE TABLE "new_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT,
    "description_en" TEXT,
    "description_zh" TEXT,
    "tags_json" TEXT,
    "package_url" TEXT,
    "version" TEXT,
    "source_from" TEXT,
    "source_url" TEXT,
    "source_author" TEXT,
    "visibility" TEXT NOT NULL,
    "owner_id" TEXT,
    "organization_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "skills_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "skills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_skills" (
    "id",
    "name",
    "identifier",
    "description",
    "description_en",
    "description_zh",
    "tags_json",
    "package_url",
    "version",
    "source_from",
    "source_url",
    "source_author",
    "visibility",
    "owner_id",
    "organization_id",
    "is_active",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "name",
    "identifier",
    "description",
    "description_en",
    "description_zh",
    "tags_json",
    "package_url",
    "version",
    "source_from",
    "source_url",
    "source_author",
    "visibility",
    "owner_id",
    "organization_id",
    "is_active",
    "created_at",
    "updated_at"
FROM "skills";

DROP TABLE "skills";
ALTER TABLE "new_skills" RENAME TO "skills";

CREATE INDEX "skills_visibility_idx" ON "skills"("visibility");
CREATE INDEX "skills_organization_id_idx" ON "skills"("organization_id");
CREATE UNIQUE INDEX "skills_identifier_organization_id_owner_id_key" ON "skills"("identifier", "organization_id", "owner_id");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
