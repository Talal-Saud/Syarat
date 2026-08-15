-- CreateEnum
CREATE TYPE "PlatformAdminGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "arabic_name" TEXT NOT NULL,
    "english_name" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "arabic_name" TEXT NOT NULL,
    "english_name" TEXT,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "PlatformAdminGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_admin_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_arabic_name_key" ON "brands"("arabic_name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "vehicle_models_brand_id_is_active_idx" ON "vehicle_models"("brand_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_brand_id_slug_key" ON "vehicle_models"("brand_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_grants_user_id_key" ON "platform_admin_grants"("user_id");

-- CreateIndex
CREATE INDEX "platform_admin_grants_status_idx" ON "platform_admin_grants"("status");

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admin_grants" ADD CONSTRAINT "platform_admin_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

