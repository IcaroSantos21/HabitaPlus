import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CobrancasCheckoutService } from './cobrancas-checkout.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly checkoutService: CobrancasCheckoutService) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe eventos do Stripe (checkout.session.completed)',
  })
  @ApiHeader({ name: 'stripe-signature', required: true })
  @ApiOkResponse({ description: 'Evento processado ou ignorado' })
  @ApiBadRequestResponse({ description: 'Assinatura ausente ou inválida' })
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<void> {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }
    await this.checkoutService.tratarWebhook(req.rawBody, signature);
  }
}
