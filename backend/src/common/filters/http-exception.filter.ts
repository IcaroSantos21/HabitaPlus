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

function getPortugueseErrorLabel(statusCode: number): string {
  const labels: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
    [HttpStatus.UNAUTHORIZED]: 'Não autorizado',
    [HttpStatus.FORBIDDEN]: 'Acesso negado',
    [HttpStatus.NOT_FOUND]: 'Não encontrado',
    [HttpStatus.METHOD_NOT_ALLOWED]: 'Método não permitido',
    [HttpStatus.CONFLICT]: 'Conflito',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'Dados inválidos',
    [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas solicitações',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno do servidor',
    [HttpStatus.BAD_GATEWAY]: 'Erro no serviço externo',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'Serviço indisponível',
    [HttpStatus.GATEWAY_TIMEOUT]: 'Tempo limite do serviço',
  };

  return labels[statusCode] ?? 'Erro na solicitação';
}

function getPortugueseMessage(statusCode: number, message: string): string {
  const normalizedMessage = message.trim().toLowerCase();
  const defaultMessages: Record<string, string> = {
    'bad request': 'Requisição inválida.',
    unauthorized: 'Autenticação necessária ou token inválido.',
    'forbidden resource': 'Você não tem permissão para acessar este recurso.',
    'not found': 'A rota solicitada não foi encontrada.',
    conflict: 'Já existe um registro com esses dados.',
    'unprocessable entity': 'Os dados enviados não puderam ser processados.',
    'internal server error': 'Erro interno do servidor.',
  };

  if (defaultMessages[normalizedMessage]) {
    return defaultMessages[normalizedMessage];
  }

  if (
    statusCode === 404 &&
    /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message)
  ) {
    return 'A rota solicitada não foi encontrada.';
  }

  return message;
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
      error: getPortugueseErrorLabel(HttpStatus.INTERNAL_SERVER_ERROR),
    };
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    // Converte diferentes formatos de exceção do Nest em um corpo único.
    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    if (typeof res === 'string') {
      return {
        statusCode,
        message: getPortugueseMessage(statusCode, res),
        error: getPortugueseErrorLabel(statusCode),
      };
    }
    const { message } = res as {
      message?: string | string[];
    };
    return {
      statusCode,
      message: getPortugueseMessage(
        statusCode,
        Array.isArray(message)
          ? message.join('; ')
          : (message ?? exception.message),
      ),
      error: getPortugueseErrorLabel(statusCode),
    };
  }
}
