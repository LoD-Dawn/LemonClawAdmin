ALTER TABLE "ai_models" ADD COLUMN "billing_tier" TEXT NOT NULL DEFAULT 'tier_1';
ALTER TABLE "ai_models" ADD COLUMN "billing_tier_name" TEXT NOT NULL DEFAULT '标准模型';
ALTER TABLE "ai_models" ADD COLUMN "credit_per_minute" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_models" ADD COLUMN "max_session_seconds" INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE "ai_models" ADD COLUMN "tool_policy" TEXT NOT NULL DEFAULT 'basic';

CREATE TABLE "user_claw_quotas" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "credit_balance" INTEGER NOT NULL DEFAULT 0,
    "pricing_version" TEXT NOT NULL DEFAULT '2026-03-v2',
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_claw_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "claw_session_reservations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "client_session_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "entry" TEXT NOT NULL,
    "workspace_path" TEXT,
    "estimated_seconds" INTEGER,
    "billing_tier" TEXT NOT NULL,
    "billing_tier_name" TEXT NOT NULL,
    "credit_per_minute" INTEGER NOT NULL,
    "max_session_seconds" INTEGER NOT NULL,
    "tool_policy" TEXT NOT NULL,
    "granted_seconds" INTEGER NOT NULL,
    "server_accepted_total_active_seconds" INTEGER NOT NULL DEFAULT 0,
    "charged_credits" INTEGER NOT NULL DEFAULT 0,
    "final_consumed_credits" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "finish_reason" TEXT,
    "last_error_code" TEXT,
    "last_client_status" TEXT,
    "last_heartbeat_at" DATETIME,
    "closed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "claw_session_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "external_api_idempotency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_fingerprint" TEXT NOT NULL,
    "response_code" TEXT NOT NULL,
    "response_message" TEXT NOT NULL DEFAULT '',
    "response_data_json" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 200,
    "reservation_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "external_api_idempotency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "external_api_idempotency_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "claw_session_reservations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "claw_session_reservations_user_id_created_at_idx" ON "claw_session_reservations"("user_id", "created_at");
CREATE INDEX "claw_session_reservations_user_id_client_session_id_idx" ON "claw_session_reservations"("user_id", "client_session_id");
CREATE INDEX "claw_session_reservations_closed_updated_at_idx" ON "claw_session_reservations"("closed", "updated_at");
CREATE UNIQUE INDEX "external_api_idempotency_user_id_scope_idempotency_key_key" ON "external_api_idempotency"("user_id", "scope", "idempotency_key");
CREATE INDEX "external_api_idempotency_reservation_id_idx" ON "external_api_idempotency"("reservation_id");
