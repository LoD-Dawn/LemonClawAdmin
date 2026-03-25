-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" TEXT,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_department_admin" BOOLEAN NOT NULL DEFAULT false,
    "department_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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

-- CreateTable
CREATE TABLE "resource_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "resource_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_grants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "active_key" TEXT,
    "granted_by" TEXT,
    "granted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" DATETIME,
    "source_application_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "resource_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "resource_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resource_grants_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "resource_applications" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "skills" (
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

-- CreateTable
CREATE TABLE "skill_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "en" TEXT NOT NULL,
    "zh" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mcps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT,
    "description_en" TEXT,
    "category" TEXT NOT NULL DEFAULT 'developer',
    "visibility" TEXT NOT NULL,
    "owner_id" TEXT,
    "organization_id" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'stdio',
    "source_value" TEXT NOT NULL DEFAULT '',
    "default_args_json" TEXT NOT NULL DEFAULT '[]',
    "required_env_keys_json" TEXT NOT NULL DEFAULT '[]',
    "optional_env_keys_json" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "mcps_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "mcps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "model_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "api_key" TEXT,
    "base_url" TEXT,
    "api_format" TEXT NOT NULL DEFAULT 'openai',
    "coding_plan_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "default_model_id" TEXT,
    "visibility" TEXT NOT NULL,
    "owner_id" TEXT,
    "organization_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "model_providers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "model_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supports_image" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ai_models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "model_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "oauth_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT NOT NULL,
    "api_key_hash" TEXT,
    "name" TEXT NOT NULL,
    "allowed_redirect_uris" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "oauth_authorization_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_authorization_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "oauth_authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "oauth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "desktop_version_releases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "singleton_key" TEXT NOT NULL DEFAULT 'desktop_release',
    "version" TEXT NOT NULL DEFAULT '',
    "release_date" TEXT NOT NULL DEFAULT '',
    "change_log_zh_title" TEXT NOT NULL DEFAULT '更新内容',
    "change_log_zh_content_json" TEXT NOT NULL DEFAULT '[]',
    "change_log_en_title" TEXT NOT NULL DEFAULT 'What''s New',
    "change_log_en_content_json" TEXT NOT NULL DEFAULT '[]',
    "mac_intel_url" TEXT NOT NULL DEFAULT '',
    "mac_arm_url" TEXT NOT NULL DEFAULT '',
    "windows_x64_url" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "organizations_path_idx" ON "organizations"("path");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

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

-- CreateIndex
CREATE UNIQUE INDEX "resource_applications_resource_type_resource_id_user_id_key" ON "resource_applications"("resource_type", "resource_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_grants_active_key_key" ON "resource_grants"("active_key");

-- CreateIndex
CREATE INDEX "resource_grants_resource_type_resource_id_idx" ON "resource_grants"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "resource_grants_resource_type_resource_id_user_id_revoked_at_idx" ON "resource_grants"("resource_type", "resource_id", "user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "resource_grants_user_id_revoked_at_idx" ON "resource_grants"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "resource_grants_source_application_id_idx" ON "resource_grants"("source_application_id");

-- CreateIndex
CREATE INDEX "skills_visibility_idx" ON "skills"("visibility");

-- CreateIndex
CREATE INDEX "skills_organization_id_idx" ON "skills"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_identifier_organization_id_owner_id_key" ON "skills"("identifier", "organization_id", "owner_id");

-- CreateIndex
CREATE INDEX "skill_tags_is_active_sort_order_idx" ON "skill_tags"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "mcps_visibility_idx" ON "mcps"("visibility");

-- CreateIndex
CREATE INDEX "mcps_organization_id_idx" ON "mcps"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "mcps_identifier_organization_id_owner_id_key" ON "mcps"("identifier", "organization_id", "owner_id");

-- CreateIndex
CREATE INDEX "model_providers_visibility_idx" ON "model_providers"("visibility");

-- CreateIndex
CREATE INDEX "model_providers_organization_id_idx" ON "model_providers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_providers_provider_key_organization_id_owner_id_key" ON "model_providers"("provider_key", "organization_id", "owner_id");

-- CreateIndex
CREATE INDEX "ai_models_provider_id_is_active_sort_order_idx" ON "ai_models"("provider_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_id_model_id_key" ON "ai_models"("provider_id", "model_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_client_id_key" ON "oauth_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_codes_code_key" ON "oauth_authorization_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_expires_at_idx" ON "oauth_authorization_codes"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_tokens_access_token_idx" ON "oauth_tokens"("access_token");

-- CreateIndex
CREATE INDEX "oauth_tokens_refresh_token_idx" ON "oauth_tokens"("refresh_token");

-- CreateIndex
CREATE INDEX "oauth_tokens_expires_at_idx" ON "oauth_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_version_releases_singleton_key_key" ON "desktop_version_releases"("singleton_key");
