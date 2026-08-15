import type { CreateVehicleDto } from '../../vehicles/dto/create-vehicle.dto';

export const vehicleImportHeaders = [
  'branchId',
  'stockNumber',
  'brandId',
  'modelId',
  'year',
  'condition',
  'price',
  'mileage',
  'transmission',
  'fuelType',
  'bodyType',
  'description'
] as const;

export type VehicleImportHeader = (typeof vehicleImportHeaders)[number];

export type ImportRowError = {
  field?: VehicleImportHeader;
  message: string;
};

export type ValidatedImportRow = {
  rowNumber: number;
  values: Record<VehicleImportHeader, string>;
  data?: CreateVehicleDto;
  errors: ImportRowError[];
};

export type ImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ValidatedImportRow[];
};
