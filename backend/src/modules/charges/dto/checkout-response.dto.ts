import { ApiProperty } from '@nestjs/swagger';

export class CheckoutResponseDto {
  @ApiProperty({
    example: 'https://checkout.stripe.com/pay/cs_test_a1b2c3d',
    description: 'Página de pagamento hospedada pelo Stripe',
  })
  url!: string;
}
