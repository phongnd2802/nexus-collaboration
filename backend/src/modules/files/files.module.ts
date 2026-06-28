import { Module, forwardRef } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController, SharedFilesController } from './files.controller';
import { StorageController } from './storage.controller';
import { PublicStorageController } from './public-storage.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [FilesController, SharedFilesController, StorageController, PublicStorageController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
