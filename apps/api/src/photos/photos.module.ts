import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { LocalDiskStorage } from './storage/local-disk.storage';
import { StoragePort } from './storage/storage.port';

@Module({
  imports: [AuthModule],
  controllers: [PhotosController],
  providers: [
    PhotosService,
    {
      provide: StoragePort,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new LocalDiskStorage(config.get<string>('UPLOADS_DIR') ?? './uploads'),
    },
  ],
})
export class PhotosModule {}
