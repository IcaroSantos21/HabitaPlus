import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppConfig } from '../../config/configuration';
import { MlClientService } from './ml-client.service';
import { NluController } from './nlu.controller';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const mlConfig = config.get('mlService', { infer: true });

        return {
          baseURL: (mlConfig?.url ?? 'http://127.0.0.1:8000').replace(
            /\/+$/,
            '',
          ),
          timeout: 3000,
          maxRedirects: 5,
        };
      },
    }),
  ],
  controllers: [NluController],
  providers: [MlClientService],
  exports: [MlClientService],
})
export class MlClientModule {}
