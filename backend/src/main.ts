import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from 'node_modules/@nestjs/config/dist/config.service';
import { AppConfig } from './config/configuration';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  // Cria a aplicação e obtém as configurações carregadas pelo módulo principal.
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  // Aplica prefixo da API, CORS, validação de entrada e formato padrão de erros.
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('corsOrigin', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Define os metadados e publica a documentação interativa da API.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Habita+ API')
    .setDescription('API do sistema de gestão de condomínio Habita+')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Inicia o servidor na porta configurada.
  await app.listen(config.get('port', { infer: true }));
}

void bootstrap();
