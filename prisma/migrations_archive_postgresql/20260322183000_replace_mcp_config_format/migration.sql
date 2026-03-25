ALTER TABLE "mcps" ADD COLUMN "description_en" TEXT;
ALTER TABLE "mcps" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'developer';
ALTER TABLE "mcps" ADD COLUMN "default_args_json" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "mcps" ADD COLUMN "required_env_keys_json" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "mcps" ADD COLUMN "optional_env_keys_json" TEXT NOT NULL DEFAULT '[]';
