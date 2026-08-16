CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS', 'MODERATION', 'CATALOG_MANAGER', 'ANALYST', 'BILLING_MANAGER');

ALTER TABLE "platform_admin_grants"
  ADD COLUMN "role" "PlatformAdminRole" NOT NULL DEFAULT 'OPERATIONS',
  ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "tenants"
  ADD COLUMN "subscription_expires_at" TIMESTAMPTZ(6);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "platform_admin_grants_status_role_idx" ON "platform_admin_grants" ("status", "role");
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" ("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_created_idx" ON "audit_logs" ("entity_type", "entity_id", "created_at");
