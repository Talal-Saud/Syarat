CREATE TYPE "SessionPrincipalKind" AS ENUM ('CUSTOMER', 'STAFF');

ALTER TABLE "sessions"
  ADD COLUMN "principal_kind" "SessionPrincipalKind" NOT NULL DEFAULT 'CUSTOMER';

CREATE INDEX "sessions_principal_kind_idx" ON "sessions" ("principal_kind");
