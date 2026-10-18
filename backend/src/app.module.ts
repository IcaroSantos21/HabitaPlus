import { Module } from '@nestjs/common';
import path from 'path';
import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { AccessTestModule } from './modules/access-test/access-test.module';

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
    HealthModule,
    AuthModule,
    AccessTestModule,
  ],
})
export class AppModule {}
