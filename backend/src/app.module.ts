import { Module } from '@nestjs/common';
import path from 'path';
import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { AccessTestModule } from './modules/access-test/access-test.module';
import { UnitsModule } from './modules/units/units.module';

// Módulos restaurados
import { RentalsModule } from './modules/rentals/rentals.module';
import { ChamadosModule } from './modules/chamados/chamado.module';
import { AnunciosModule } from './modules/listings/anuncios.module';
import { TransacoesModule } from './modules/transacoes/transacoes.module';
import { ResidentsModule } from './modules/residents/residents.module';
import { CobrancasModule } from './modules/charges/cobrancas.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import { FinanceModule } from './modules/finance/finance.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { MlClientModule } from './modules/ml-client/ml-client.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';

@Module({
  imports: [
    // Carrega configurações do ambiente e disponibiliza o acesso ao banco.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../.env'),
      load: [configuration],
      validate: validateEnv,
    }),

    TypeOrmModule.forRootAsync({
      // Monta a conexão com o PostgreSQL usando as configurações validadas.
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('database', { infer: true });

        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),

    ScheduleModule.forRoot(),

    // Módulos principais
    HealthModule,
    AuthModule,
    AccessTestModule,
    UnitsModule,

    // Módulos restaurados
    RentalsModule,
    ChamadosModule,
    AnunciosModule,
    TransacoesModule,
    ResidentsModule,
    CobrancasModule,
    NotificationsModule,

    FinanceModule,
    MessagesModule,
    AnnouncementsModule,
    MlClientModule,
    PredictionsModule,
    ChatbotModule,
  ],
})
export class AppModule {}
