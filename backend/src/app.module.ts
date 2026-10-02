import { Module } from '@nestjs/common';
import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { ConfigModule } from 'node_modules/@nestjs/config/dist/config.module';
import { ConfigService } from 'node_modules/@nestjs/config/dist/config.service';
import { HealthModule } from './modules/health/health.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
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
    HealthModule,
  ],
})
export class AppModule {}
