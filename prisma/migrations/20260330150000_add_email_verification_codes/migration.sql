CREATE TABLE "email_verification_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "last_sent_at" DATETIME NOT NULL,
    "consumed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "email_verification_codes_email_purpose_key" ON "email_verification_codes"("email", "purpose");
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes"("expires_at");
