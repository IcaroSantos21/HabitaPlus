import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { CobrancasController } from './cobrancas.controller';
import { CobrancasAtrasadasJob } from './cobrancas-atrasadas.job';
import { CobrancasRepository } from './cobrancas.repository';
import { CobrancasService } from './cobrancas.service';
import { CobrancasCheckoutService } from './cobrancas-checkout.service';
import { PagamentosModule } from '../payments/pagamentos.module';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cobranca]), PagamentosModule],
  controllers: [CobrancasController, StripeWebhookController],
  providers: [
    CobrancasRepository,
    CobrancasService,
    CobrancasCheckoutService,
    CobrancasAtrasadasJob,
  ],
  exports: [CobrancasService],
})
export class CobrancasModule {}
