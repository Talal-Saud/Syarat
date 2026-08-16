-- Quote Request CRM foundation: preserve tenant and branch boundaries at the database layer.
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'INTERESTED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'APPOINTMENT';

CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'NOTE_ADDED');

ALTER TABLE "leads"
  ADD COLUMN "branch_id" UUID,
  ADD COLUMN "customer_user_id" UUID,
  ADD COLUMN "phone_e164" TEXT,
  ADD COLUMN "assigned_employee_id" UUID;

-- Existing MVP lead rows must be backfilled before enforcing the new CRM contract.
UPDATE "leads" l
SET "branch_id" = v."branch_id"
FROM "vehicles" v
WHERE l."vehicle_id" = v."id" AND l."branch_id" IS NULL;

ALTER TABLE "leads"
  ALTER COLUMN "branch_id" SET NOT NULL,
  ALTER COLUMN "customer_user_id" SET NOT NULL,
  ALTER COLUMN "phone_e164" SET NOT NULL;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_branch_fk" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches" ("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "leads_customer_user_fk" FOREIGN KEY ("customer_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "leads_assigned_employee_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "tenant_memberships" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lead_activities" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "actor_membership_id" UUID,
  "type" "LeadActivityType" NOT NULL,
  "from_status" "LeadStatus",
  "to_status" "LeadStatus",
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_activities_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_activities_lead_fk" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_activities_actor_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "tenant_memberships" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "leads_tenant_branch_status_created_idx" ON "leads" ("tenant_id", "branch_id", "status", "created_at");
CREATE INDEX "leads_customer_vehicle_created_idx" ON "leads" ("customer_user_id", "vehicle_id", "created_at");
CREATE INDEX "lead_activities_tenant_lead_created_idx" ON "lead_activities" ("tenant_id", "lead_id", "created_at");
