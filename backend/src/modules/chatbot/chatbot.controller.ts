import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { ChatbotMessageResponse, ChatbotService } from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';

@ApiTags('chatbot')
@ApiBearerAuth()
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({ summary: 'Envia uma mensagem ao assistente virtual' })
  @ApiResponse({ status: 201, description: 'Resposta do assistente virtual' })
  async message(
    @Body() dto: ChatbotMessageDto,
    @CurrentUser() user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    return this.chatbotService.handleMessage(dto.text, user);
  }
}
