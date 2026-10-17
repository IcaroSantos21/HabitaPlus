import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Formato comum usado nas respostas de erro da API.
interface ErrorBody {
  statusCode: number;
  message: string;
  error: string;
}

// Converte erros da aplicação em uma resposta HTTP padronizada.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Recupera a resposta HTTP e envia o corpo de erro já normalizado.
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.buildBody(exception);
    response.status(body.statusCode).json(body);
  }

  private buildBody(exception: unknown): ErrorBody {
    // Mantém o status e a mensagem de erros HTTP conhecidos pelo Nest.
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    // Registra detalhes internos, mas não os expõe na resposta ao cliente.
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
      error: 'Internal Server Error',
    };
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    // Converte diferentes formatos de exceção do Nest em um corpo único.
    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'string') {
      return { statusCode, message: res, error: exception.name };
    }
    const { message, error } = res as {
      message?: string | string[];
      error?: string;
    };
    return {
      statusCode,
      message: Array.isArray(message)
        ? message.join('; ')
        : (message ?? exception.message),
      error: error ?? exception.name,
    };
  }
}
