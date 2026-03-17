import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StationsModule } from './stations/stations.module';
import { SessionsModule } from './sessions/sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { CitrineosModule } from './citrineos/citrineos.module';
import { SettingsModule } from './settings/settings.module';
import { HealthController } from './health/health.controller'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StationsModule,
    SessionsModule,
    PaymentsModule,
    CitrineosModule,
    SettingsModule,
  ],
  controllers: [AppController, HealthController], 
  providers: [AppService],
})
export class AppModule {}