import { ArgumentsHost, BadRequestException, NotFoundException, Logger} from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
    const filter = new AllExceptionsFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
        switchToHttp: () => ({ getResponse: () => ({ status })}),
    } as unknown as ArgumentsHost;

    beforeEach(() => jest.clearAllMocks());

    it('deve devolver o formato único para exceções do Nest', () => {
        filter.catch(new NotFoundException('Chamado não encontrado'), host);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith({
            statusCode: 404,
            message: 'Chamado não encontrado',
            error: 'Not Found'
        });
    });

    it('deve juntar as mensagens quando a validação devolve uma lista', () => {
        filter.catch(new BadRequestException(['nome é obrigatório', 'email inválido']), host);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            statusCode: 400,
            message: 'nome é obrigatório; email inválido',
            error: 'Bad Request',
        });
    });

    it('deve responder 500 genérico sem vazar detalhes de erros inesperados', () => {
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
        filter.catch(new Error('senha do banco: 123'), host);

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
            statusCode: 500,
            message: 'Erro interno do servidor',
            error: 'Internal Server Error',
        });
    });
})