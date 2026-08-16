export type PublicVehicleDto = {
  publicId: string;
  year: number;
  condition: string;
  price: string;
  mileage: number | null;
  transmission: string;
  fuel: string;
  bodyType: string;
  description: string | null;
  dealer: { name: string; slug: string };
  city: { arabicName: string; englishName: string | null; slug: string };
  branchName: string;
  brand: { arabicName: string; englishName: string | null; slug: string };
  model: { arabicName: string; englishName: string | null; slug: string };
  lastAvailabilityConfirmedAt: string | null;
};

export type PublicDealerDto = {
  name: string;
  slug: string;
  branches: Array<{
    name: string;
    city: { arabicName: string; englishName: string | null; slug: string };
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
  }>;
  vehicleCount: number;
};

export type PublicListResponse<T> = {
  data: T[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean };
};
