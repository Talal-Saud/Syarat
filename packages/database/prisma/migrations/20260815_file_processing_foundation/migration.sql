CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'PREVIEW_READY', 'QUEUED', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

ALTER TABLE "vehicle_images"
  ADD COLUMN "thumbnail_storage_key" TEXT,
  ADD COLUMN "optimized_storage_key" TEXT,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "byte_size" INTEGER;

CREATE TABLE "import_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "invalid_rows" INTEGER NOT NULL DEFAULT 0,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "error_report_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "import_jobs_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "tenant_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "import_jobs_tenant_id_status_created_at_idx" ON "import_jobs"("tenant_id", "status", "created_at");
