import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Valores possíveis retornados pela verificação de saúde.
export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
}

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  // Testa o banco com uma consulta simples e informa se ele está acessível.
  async checkHealth(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      // Responde com estado degradado quando a consulta ao banco falha.
      return { status: 'degraded', database: 'down' };
    }
  }
}
