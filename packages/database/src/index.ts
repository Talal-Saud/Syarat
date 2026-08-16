import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export {
  AvailabilityStatus,
  BodyType,
  FuelType,
  ImportJobStatus,
  LeadActivityType,
  LeadStatus,
  MembershipRole,
  MembershipStatus,
  OtpPurpose,
  PlanCode,
  PlatformAdminGrantStatus,
  PlatformAdminRole,
  PublicationStatus,
  Prisma,
  ReservationStatus,
  SessionPrincipalKind,
  PrismaClient,
  TenantStatus,
  TransmissionType,
  VehicleCondition,
  UserStatus,
  VerificationStatus
} from '@prisma/client';

