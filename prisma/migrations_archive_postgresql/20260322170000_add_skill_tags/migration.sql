CREATE TABLE "skill_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "en" TEXT NOT NULL,
    "zh" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "skill_tags_is_active_sort_order_idx" ON "skill_tags"("is_active", "sort_order");

INSERT INTO "skill_tags" ("id", "en", "zh", "sort_order", "is_active", "created_at", "updated_at")
VALUES ('productivity', 'Productivity', '效率', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
