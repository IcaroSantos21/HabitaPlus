import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChamadosModule } from '../chamados/chamado.module';
import { CobrancasModule } from '../charges/cobrancas.module';
import { MlClientModule } from '../ml-client/ml-client.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { ResidentsModule } from '../residents/residents.module';
import { UnitsModule } from '../units/units.module';

@Module({
  imports: [
    MlClientModule,
    UnitsModule,
    ChamadosModule,
    CobrancasModule,
    ResidentsModule,
    PredictionsModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
