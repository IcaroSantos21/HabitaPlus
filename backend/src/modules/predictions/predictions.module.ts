import { Module } from '@nestjs/common';

import { MlClientModule } from '../ml-client/ml-client.module';
import { TransacoesModule } from '../transacoes/transacoes.module';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  imports: [MlClientModule, TransacoesModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
