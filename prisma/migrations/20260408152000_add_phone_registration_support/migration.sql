ALTER TABLE "users" ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "phone_verification_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "last_sent_at" DATETIME NOT NULL,
    "consumed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "phone_verification_codes_phone_purpose_key" ON "phone_verification_codes"("phone", "purpose");
CREATE INDEX "phone_verification_codes_expires_at_idx" ON "phone_verification_codes"("expires_at");
