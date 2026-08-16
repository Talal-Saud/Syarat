ALTER TABLE "tenants"
  ADD COLUMN "public_id" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "vehicles"
  ADD COLUMN "public_id" UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "cities"
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "brands"
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "vehicle_models"
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "tenants_public_id_key" ON "tenants"("public_id");
CREATE UNIQUE INDEX "vehicles_public_id_key" ON "vehicles"("public_id");

CREATE INDEX "branches_city_id_id_idx" ON "branches"("city_id", "id");
CREATE INDEX "vehicles_public_eligibility_idx"
  ON "vehicles"("publication_status", "availability_status", "branch_id", "created_at" DESC, "id" DESC)
  WHERE "publication_status" = 'PUBLISHED' AND "availability_status" IN ('AVAILABLE', 'RESERVED');
CREATE INDEX "vehicles_public_price_idx"
  ON "vehicles"("price", "id")
  WHERE "publication_status" = 'PUBLISHED' AND "availability_status" IN ('AVAILABLE', 'RESERVED');
CREATE INDEX "vehicles_public_mileage_idx"
  ON "vehicles"("mileage", "id")
  WHERE "publication_status" = 'PUBLISHED' AND "availability_status" IN ('AVAILABLE', 'RESERVED') AND "mileage" IS NOT NULL;
CREATE INDEX "vehicles_public_confirmed_idx"
  ON "vehicles"("last_availability_confirmed_at" DESC NULLS LAST, "id" DESC)
  WHERE "publication_status" = 'PUBLISHED' AND "availability_status" IN ('AVAILABLE', 'RESERVED');
