import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import ExcelJS from 'exceljs';
import { extname } from 'node:path';

import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import {
  type ImportPreview,
  type ImportRowError,
  type ValidatedImportRow,
  type VehicleImportHeader,
  vehicleImportHeaders
} from './dto/import.dto';

const csvMimeTypes = new Set(['text/csv', 'application/csv', 'text/plain']);
const xlsxMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const xlsxExtension = '.xlsx';
const csvExtension = '.csv';

@Injectable()
export class ImportValidatorService {
  static readonly maxBytes = 10 * 1024 * 1024;
  static readonly maxRows = 5_000;
  static readonly largeFileRows = 300;
  private static readonly maxXlsxEntries = 1_000;
  private static readonly maxXlsxUncompressedBytes = 40 * 1024 * 1024;

  async validateFile(
    bytes: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ImportPreview> {
    if (bytes.byteLength === 0 || bytes.byteLength > ImportValidatorService.maxBytes) {
      throw new PayloadTooLargeException({
        code: 'IMPORT_SIZE_INVALID',
        message: 'حجم ملف الاستيراد غير مسموح.'
      });
    }

    const extension = extname(filename).toLowerCase();
    if (extension === csvExtension && csvMimeTypes.has(mimeType.toLowerCase())) {
      return this.validateRows(this.parseCsv(bytes));
    }
    if (extension === xlsxExtension && xlsxMimeTypes.has(mimeType.toLowerCase())) {
      this.assertXlsxArchiveBounds(bytes);
      return this.validateRows(await this.parseXlsx(bytes));
    }

    throw new BadRequestException({
      code: 'IMPORT_TYPE_INVALID',
      message: 'يُسمح فقط بملفات CSV أو XLSX المطابقة لنوع MIME والامتداد.'
    });
  }

  shouldQueue(preview: ImportPreview): boolean {
    return preview.totalRows > ImportValidatorService.largeFileRows;
  }

  escapeForSpreadsheet(value: string): string {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('vehicles');
    sheet.addRow([...vehicleImportHeaders]);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns = vehicleImportHeaders.map((header) => ({
      header,
      key: header,
      width: header === 'description' ? 40 : 22
    }));
    const guide = workbook.addWorksheet('instructions');
    guide.addRows([
      ['تعليمات استيراد المركبات'],
      ['يجب عدم تغيير أسماء الأعمدة أو ترتيبها في ورقة vehicles.'],
      ['القيم المسموحة: condition = NEW أو USED.'],
      ['القيم المسموحة: transmission = AUTOMATIC أو MANUAL.'],
      ['القيم المسموحة: fuelType = GASOLINE أو DIESEL أو HYBRID أو ELECTRIC.'],
      ['القيم المسموحة: bodyType = SEDAN أو SUV أو PICKUP أو HATCHBACK أو COUPE أو VAN أو OTHER.'],
      ['يجب أن تتبع branchId وbrandId وmodelId صيغة UUID وأن تكون صالحة ضمن المعرض والكتالوج.'],
      ['سيُنشأ كل صف صحيح كمسودة، وستظهر الصفوف غير الصحيحة في تقرير الأخطاء.']
    ]);
    guide.getRow(1).font = { bold: true };
    guide.getColumn(1).width = 120;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async buildErrorReport(rows: readonly ValidatedImportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('errors');
    sheet.addRow(['rowNumber', ...vehicleImportHeaders, 'errors']);
    sheet.getRow(1).font = { bold: true };

    for (const row of rows.filter((candidate) => candidate.errors.length > 0)) {
      sheet.addRow([
        row.rowNumber,
        ...vehicleImportHeaders.map((header) => this.escapeForSpreadsheet(row.values[header])),
        this.escapeForSpreadsheet(row.errors.map((error) => error.message).join(' | '))
      ]);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async parseXlsx(bytes: Buffer): Promise<Array<Record<VehicleImportHeader, string>>> {
    const workbook = new ExcelJS.Workbook();
    try {
      const xlsxInput = bytes as unknown as Parameters<typeof workbook.xlsx.load>[0];
      await workbook.xlsx.load(xlsxInput);
    } catch {
      throw new BadRequestException({
        code: 'IMPORT_XLSX_MALFORMED',
        message: 'تعذر قراءة ملف XLSX. تأكد من أن الملف سليم.'
      });
    }

    const sheet = workbook.getWorksheet('vehicles') ?? workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException({
        code: 'IMPORT_SHEET_MISSING',
        message: 'ملف الاستيراد لا يحتوي على ورقة بيانات للمركبات.'
      });
    }
    if (sheet.rowCount - 1 > ImportValidatorService.maxRows) {
      throw new PayloadTooLargeException({
        code: 'IMPORT_ROWS_EXCEEDED',
        message: 'يتجاوز الملف الحد الأقصى لعدد الصفوف المسموح.'
      });
    }

    this.assertHeaders(
      vehicleImportHeaders.map((_, index) => this.cellText(sheet.getRow(1).getCell(index + 1).value))
    );

    const rows: Array<Record<VehicleImportHeader, string>> = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const values = this.toValues(
        vehicleImportHeaders.map((_, index) => this.cellText(row.getCell(index + 1).value))
      );
      if (Object.values(values).some((value) => value !== '')) rows.push(values);
    }
    return rows;
  }

  private parseCsv(bytes: Buffer): Array<Record<VehicleImportHeader, string>> {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
    } catch {
      throw new BadRequestException({
        code: 'IMPORT_CSV_ENCODING_INVALID',
        message: 'يجب أن يكون ملف CSV مرمزاً بترميز UTF-8 صالح.'
      });
    }
    if (text.includes('\0')) {
      throw new BadRequestException({
        code: 'IMPORT_CSV_MALFORMED',
        message: 'ملف CSV يحتوي على محتوى غير صالح.'
      });
    }

    const parsed = this.parseCsvRows(text);
    if (parsed.length === 0) {
      throw new BadRequestException({
        code: 'IMPORT_EMPTY',
        message: 'ملف الاستيراد لا يحتوي على بيانات.'
      });
    }
    if (parsed.length - 1 > ImportValidatorService.maxRows) {
      throw new PayloadTooLargeException({
        code: 'IMPORT_ROWS_EXCEEDED',
        message: 'يتجاوز الملف الحد الأقصى لعدد الصفوف المسموح.'
      });
    }
    this.assertHeaders(parsed[0] ?? []);

    return parsed.slice(1).map((row) => this.toValues(row));
  }

  private async validateRows(
    rows: Array<Record<VehicleImportHeader, string>>
  ): Promise<ImportPreview> {
    const validated: ValidatedImportRow[] = [];
    const stockNumbers = new Map<string, ValidatedImportRow[]>();

    for (const [index, values] of rows.entries()) {
      const row = await this.validateRow(index + 2, values);
      validated.push(row);
      if (row.data) {
        const duplicates = stockNumbers.get(row.data.stockNumber) ?? [];
        duplicates.push(row);
        stockNumbers.set(row.data.stockNumber, duplicates);
      }
    }

    for (const duplicates of stockNumbers.values()) {
      if (duplicates.length > 1) {
        for (const row of duplicates) {
          row.errors.push({
            field: 'stockNumber',
            message: 'رقم المخزون مكرر داخل ملف الاستيراد.'
          });
          delete row.data;
        }
      }
    }

    const validRows = validated.filter((row) => row.errors.length === 0).length;
    return {
      totalRows: validated.length,
      validRows,
      invalidRows: validated.length - validRows,
      rows: validated
    };
  }

  private async validateRow(
    rowNumber: number,
    values: Record<VehicleImportHeader, string>
  ): Promise<ValidatedImportRow> {
    const formulaFields = vehicleImportHeaders.filter(
      (field) => values[field] !== '' && /^[=+\-@]/.test(values[field])
    );
    const errors: ImportRowError[] = formulaFields.map((field) => ({
      field,
      message: `لا يسمح الحقل ${field} بصيغ جداول البيانات.`
    }));
    const dto = plainToInstance(CreateVehicleDto, {
      branchId: values.branchId,
      stockNumber: values.stockNumber,
      brandId: values.brandId,
      modelId: values.modelId,
      year: this.toNumber(values.year),
      condition: values.condition,
      price: this.toNumber(values.price),
      mileage: values.mileage === '' ? undefined : this.toNumber(values.mileage),
      transmission: values.transmission,
      fuelType: values.fuelType,
      bodyType: values.bodyType,
      description: values.description === '' ? undefined : values.description
    });
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true
    });
    if (validationErrors.length > 0) {
      errors.push({
        message: 'بيانات الصف لا تطابق متطلبات المركبة أو القيم المسموح بها.'
      });
    }

    return {
      rowNumber,
      values,
      ...(errors.length === 0 ? { data: dto } : {}),
      errors
    };
  }

  private assertHeaders(headers: readonly string[]): void {
    const valid =
      headers.length === vehicleImportHeaders.length &&
      vehicleImportHeaders.every((header, index) => headers[index] === header);
    if (!valid) {
      throw new BadRequestException({
        code: 'IMPORT_HEADERS_INVALID',
        message: 'أعمدة ملف الاستيراد لا تطابق القالب المعتمد.'
      });
    }
  }

  private toValues(values: readonly string[]): Record<VehicleImportHeader, string> {
    return Object.fromEntries(
      vehicleImportHeaders.map((header, index) => [header, (values[index] ?? '').trim()])
    ) as Record<VehicleImportHeader, string>;
  }

  private cellText(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined && value.result !== null) return String(value.result);
    return '';
  }

  private toNumber(value: string): number {
    return Number(value);
  }

  private parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index] as string;
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          cell += character;
        }
        continue;
      }

      if (character === '"') {
        quoted = true;
      } else if (character === ',') {
        row.push(cell);
        cell = '';
      } else if (character === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += character;
      }
    }

    if (quoted) {
      throw new BadRequestException({
        code: 'IMPORT_CSV_MALFORMED',
        message: 'يتضمن ملف CSV علامات اقتباس غير مكتملة.'
      });
    }
    if (cell !== '' || row.length > 0) {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
    }
    return rows;
  }

  private assertXlsxArchiveBounds(bytes: Buffer): void {
    if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) {
      throw new BadRequestException({
        code: 'IMPORT_XLSX_SIGNATURE_INVALID',
        message: 'محتوى ملف XLSX لا يطابق بنيته المتوقعة.'
      });
    }

    const eocdSignature = 0x06054b50;
    const minimumOffset = Math.max(0, bytes.length - 65_557);
    let eocdOffset = -1;
    for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
      if (bytes.readUInt32LE(offset) === eocdSignature) {
        eocdOffset = offset;
        break;
      }
    }
    if (eocdOffset < 0) {
      throw new BadRequestException({
        code: 'IMPORT_XLSX_MALFORMED',
        message: 'بنية ملف XLSX غير مكتملة أو غير صالحة.'
      });
    }

    const entries = bytes.readUInt16LE(eocdOffset + 10);
    const centralDirectoryOffset = bytes.readUInt32LE(eocdOffset + 16);
    if (entries > ImportValidatorService.maxXlsxEntries || centralDirectoryOffset >= bytes.length) {
      throw new PayloadTooLargeException({
        code: 'IMPORT_XLSX_ARCHIVE_EXCEEDED',
        message: 'يتجاوز أرشيف XLSX حدود المعالجة المسموح بها.'
      });
    }

    let offset = centralDirectoryOffset;
    let uncompressedBytes = 0;
    for (let entry = 0; entry < entries; entry += 1) {
      if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) {
        throw new BadRequestException({
          code: 'IMPORT_XLSX_MALFORMED',
          message: 'بنية دليل ملف XLSX غير صالحة.'
        });
      }
      const uncompressedSize = bytes.readUInt32LE(offset + 24);
      const nameLength = bytes.readUInt16LE(offset + 28);
      const extraLength = bytes.readUInt16LE(offset + 30);
      const commentLength = bytes.readUInt16LE(offset + 32);
      if (uncompressedSize === 0xffff_ffff) {
        throw new PayloadTooLargeException({
          code: 'IMPORT_XLSX_ZIP64_UNSUPPORTED',
          message: 'ملف XLSX يتجاوز بنية الأرشيف المسموح بها.'
        });
      }
      uncompressedBytes += uncompressedSize;
      if (uncompressedBytes > ImportValidatorService.maxXlsxUncompressedBytes) {
        throw new PayloadTooLargeException({
          code: 'IMPORT_XLSX_ARCHIVE_EXCEEDED',
          message: 'يتجاوز ملف XLSX الحد المسموح لفك الضغط والمعالجة.'
        });
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
  }
}
