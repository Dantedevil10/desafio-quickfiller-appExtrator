import request from 'supertest';
import express from 'express';
import multer from 'multer';

// Mock básico do app para testar os middlewares e contratos HTTP isoladamente
const app = express();
app.get('/healthz', (req, res) => res.status(200).send('OK'));

const upload = multer({
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Apenas arquivos PDF são permitidos.'));
    }
});

app.post('/api/transcricoes', (req, res, next) => {
    upload.single('arquivo')(req, res, (err) => {
        if (err) return res.status(400).json({ erro: err.message });
        if (!req.file) return res.status(400).json({ erro: 'Campo "arquivo" é obrigatório.' });
        res.status(202).json({ id: "mock-123" });
    });
});

describe('Testes de Contrato da API', () => {
    it('Deve retornar 200 OK na rota /healthz', async () => {
        const response = await request(app).get('/healthz');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('Deve rejeitar requisições sem arquivo no POST /api/transcricoes', async () => {
        const response = await request(app)
            .post('/api/transcricoes')
            .field('tipo', 'holerite');
        
        expect(response.status).toBe(400);
        expect(response.body.erro).toBe('Campo "arquivo" é obrigatório.');
    });

    it('Deve rejeitar arquivos que não sejam PDF', async () => {
        const response = await request(app)
            .post('/api/transcricoes')
            .field('tipo', 'cartao-ponto')
            .attach('arquivo', Buffer.from('texto falso'), 'teste.txt'); // Simulando envio de txt
        
        expect(response.status).toBe(400);
        expect(response.body.erro).toBe('Apenas arquivos PDF são permitidos.');
    });
});