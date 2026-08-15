// src/worker.js
import { Worker } from 'bullmq';
import { redis } from './queue.js';
import { extrairTextoPDF, estruturarDados } from './extractor.js';
import fs from 'fs'; // <-- Adicionado para manipular arquivos do sistema

const worker = new Worker('pdf-extraction', async job => {
    console.log(`👷 Iniciando transcrição ${job.id}`);
    
    try {
        const textoBruto = await extrairTextoPDF(job.data.filePath, job);
        
        // Mapeia para suportar 'cartao-ponto' (novo) ou 'ponto' (antigo) do seu extractor
        const tipoExtrator = job.data.tipo === 'cartao-ponto' ? 'ponto' : 'holerite';
        const jsonEstruturado = estruturarDados(textoBruto, tipoExtrator);
        
        // Monta o objeto exato do contrato
        const transcricaoData = {
            id: job.id,
            tipo: job.data.tipo,
            status: "concluido",
            erro: null,
            value: jsonEstruturado
        };

        // Salva no Redis (Expira em 24h para limpar o cache automaticamente)
        await redis.set(`transcricao:${job.id}`, JSON.stringify(transcricaoData), 'EX', 86400);

        console.log(`✅ Transcrição ${job.id} concluída!`);
        return true;

    } catch (error) {
        console.error(`❌ Erro na transcrição ${job.id}:`, error.message);
        throw error; 
    } finally {
        // ==========================================
        // 🧹 LIMPEZA DO HD (Garante que o disco não lote)
        // ==========================================
        if (job.data.filePath && fs.existsSync(job.data.filePath)) {
            try {
                fs.unlinkSync(job.data.filePath);
                console.log(`🗑️ Arquivo original removido com sucesso: ${job.data.filePath}`);
            } catch (unlinkError) {
                console.error(`⚠️ Falha ao tentar deletar o arquivo ${job.data.filePath}:`, unlinkError.message);
            }
        }
    }
}, { 
    connection: redis,
    concurrency: 2 
});

console.log('👷 Worker iniciado e escutando a fila...');