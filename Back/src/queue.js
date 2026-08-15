// src/queue.js
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// 1. Pega a URL do Redis das variáveis de ambiente (do Docker ou do Render).
// Se não encontrar, faz o fallback para o localhost padrão (para testes rodando o Node direto na sua máquina).
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 2. Passa a URL como primeiro parâmetro na hora de criar a conexão
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null
});

// 3. Cria a fila passando a conexão configurada
export const pdfQueue = new Queue('pdf-extraction', { 
    connection: redis 
});