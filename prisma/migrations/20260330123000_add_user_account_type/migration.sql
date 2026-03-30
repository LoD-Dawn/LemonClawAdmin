ALTER TABLE "users" ADD COLUMN "account_type" TEXT NOT NULL DEFAULT 'enterprise';

UPDATE "users"
SET "account_type" = CASE
  WHEN "organization_id" = '00000000-0000-0000-0000-000000000002' THEN 'consumer'
  ELSE 'enterprise'
END;
