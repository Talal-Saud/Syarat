import { Global, Module } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import { StorageService } from './storage.service';

@Global()
@Module({ providers: [StorageService, ImageProcessingService], exports: [StorageService, ImageProcessingService] })
export class StorageModule {}
