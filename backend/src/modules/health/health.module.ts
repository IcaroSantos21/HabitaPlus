import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  // Registra o endpoint de saúde e o serviço que verifica a conexão com o banco.
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
