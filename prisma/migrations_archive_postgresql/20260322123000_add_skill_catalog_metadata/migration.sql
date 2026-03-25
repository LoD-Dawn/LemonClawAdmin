ALTER TABLE "skills" ADD COLUMN "description_en" TEXT;
ALTER TABLE "skills" ADD COLUMN "description_zh" TEXT;
ALTER TABLE "skills" ADD COLUMN "tags_json" TEXT;
ALTER TABLE "skills" ADD COLUMN "package_url" VARCHAR(1000);
ALTER TABLE "skills" ADD COLUMN "version" VARCHAR(255);
ALTER TABLE "skills" ADD COLUMN "source_from" VARCHAR(255);
ALTER TABLE "skills" ADD COLUMN "source_url" VARCHAR(1000);
ALTER TABLE "skills" ADD COLUMN "source_author" VARCHAR(255);
