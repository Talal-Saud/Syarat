-- Inventory history tables and tenant-first vehicle lookup index.
CREATE TABLE "price_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "previous_price" DECIMAL(14,2) NOT NULL,
  "new_price" DECIMAL(14,2) NOT NULL,
  "changed_by_membership_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_history_tenant_id_vehicle_id_fkey" FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "price_history_tenant_id_vehicle_id_created_at_idx" ON "price_history"("tenant_id", "vehicle_id", "created_at");

CREATE TABLE "vehicle_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "previous_publication_status" "PublicationStatus",
  "new_publication_status" "PublicationStatus",
  "previous_availability_status" "AvailabilityStatus",
  "new_availability_status" "AvailabilityStatus",
  "changed_by_membership_id" UUID,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_status_history_tenant_id_vehicle_id_fkey" FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "vehicle_status_history_tenant_id_vehicle_id_created_at_idx" ON "vehicle_status_history"("tenant_id", "vehicle_id", "created_at");

CREATE INDEX "vehicles_tenant_id_publication_status_availability_status_idx" ON "vehicles"("tenant_id", "publication_status", "availability_status");

-- PostgreSQL partial index is the durable guard against double active reservations.
CREATE UNIQUE INDEX "reservations_one_active_per_vehicle_idx"
  ON "reservations"("tenant_id", "vehicle_id")
  WHERE "status" = 'ACTIVE';
