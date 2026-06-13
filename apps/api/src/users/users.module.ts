import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PhotosModule } from '../photos/photos.module';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { UsersController } from './users.controller';

@Module({
  imports: [AuthModule, PhotosModule],
  controllers: [UsersController, AvatarController],
  providers: [AvatarService],
})
export class UsersModule {}
