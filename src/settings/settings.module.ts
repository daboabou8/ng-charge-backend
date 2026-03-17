import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { OffersService } from './services/offers.service';
import { AppSettingsService } from './services/app-settings.service';
import { NotificationTemplatesService } from './services/notification-templates.service';
import { SystemLogsService } from './services/system-logs.service';

// Controllers
import { OffersController } from './controllers/offers.controller';
import { AppSettingsController } from './controllers/app-settings.controller';
import { NotificationTemplatesController } from './controllers/notification-templates.controller';
import { SystemLogsController } from './controllers/system-logs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    OffersController,
    AppSettingsController,
    NotificationTemplatesController,
    SystemLogsController,
  ],
  providers: [
    OffersService,
    AppSettingsService,
    NotificationTemplatesService,
    SystemLogsService,
  ],
  exports: [
    OffersService,
    AppSettingsService,
    NotificationTemplatesService,
    SystemLogsService,
  ],
})
export class SettingsModule {}