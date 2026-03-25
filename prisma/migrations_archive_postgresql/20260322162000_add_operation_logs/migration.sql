-- CreateTable
CREATE TABLE "operation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "actor_email" TEXT,
    "actor_client_id" TEXT,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "target_name" TEXT,
    "target_user_id" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT,
    "method" TEXT,
    "path" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operation_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "operation_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "operation_logs_actor_user_id_created_at_idx" ON "operation_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_target_user_id_created_at_idx" ON "operation_logs"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_module_created_at_idx" ON "operation_logs"("module", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_action_created_at_idx" ON "operation_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_target_type_target_id_idx" ON "operation_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs"("created_at");
