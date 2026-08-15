# Quick Filler - Extrator de Documentos Trabalhistas

> ⚠️ **AVISO IMPORTANTE: AMBIENTE DE PRODUÇÃO VS. LOCAL** ⚠️
> Este projeto está atualmente hospedado e publicado, portanto, o código fonte reflete a configuração do meu ambiente próprio na nuvem. 
> 
> **Para rodar localmente:** Será preciso alterar as URLs de integração. Verifique o seu `.env` (ou as variáveis de ambiente do sistema) e a URL base configurada no Angular para evitar erros de conexão (ex: apontar para a nuvem em vez do localhost).
> 
> **Caso deseje rodar exclusivamente via Docker:** Altere somente a URL do frontend (nos services/environments) para apontar para a API local e verifique se o serviço do Redis está rodando e se comunicando corretamente com o backend. E NÃO APAGUE A PASTA UPLOADS
>ela é precisa para realizar o upload dos pdfs

---

##  Como Rodar

O projeto foi orquestrado para rodar com um único comando, subindo 3 contêineres (Frontend, Backend-Server/Worker e Redis):

\`\`\`bash
docker compose up -d
\`\`\`
- O **Frontend (Angular)** estará disponível em `http://localhost:8080`.
- O **Backend (Node.js)** responderá em `http://localhost:3000`.

##  Decisões Técnicas e Arquitetura

1. **Processamento Assíncrono (BullMQ + Redis):**
   O OCR de PDFs escaneados é uma tarefa bloqueante e pesada. Fazer isso dentro da requisição HTTP derrubaria o servidor. Optei por separar a aplicação em um modelo Server/Worker. A API recebe o arquivo e devolve um HTTP `202 Accepted` imediatamente, enquanto o Worker lida com a extração pesada em background.
2. **Abordagem de Leitura Híbrida:**
   O extrator primeiro tenta ler o documento nativamente (`pdf.js-extract`). Apenas se não houver camada de texto (imagem pura), ele faz o fallback para o OCR (`tesseract.js` + `canvas`). Isso economiza drasticamente o uso de CPU e Memória na maioria dos casos.
3. **Frontend em Angular:**
   Escolhido pela facilidade de tipagem e estruturação em components. O Nginx foi configurado para lidar com o roteamento da SPA no contêiner.

##  Segurança e Privacidade (Política de Retenção)

- **Upload e Limites:** O `multer` está estritamente configurado para validar o mimetype (`application/pdf`) e bloquear arquivos maiores que 10MB.
- **Limpeza Síncrona do Disco:** O PDF enviado é salvo temporariamente. No exato milissegundo em que o worker termina a extração (ou se ocorre uma falha fatal), o arquivo é deletado do HD permanentemente via `fs.unlinkSync` dentro de um bloco `finally`.
- **Expurgo de Dados (Redis):** Os dados extraídos (JSON) ficam disponíveis em cache no Redis por apenas **24 horas** (`EX 86400`) para permitir a correção e download pelo usuário. Após esse período, os dados (PII) são completamente destruídos. Logs sensíveis (resultados de OCR) foram suprimidos do console.

##  Bônus Implementados
- **Ficha Financeira:** O parser identifica holerites anuais (múltiplas colunas) e faz o split de `fields` e `bases` mês a mês automaticamente.

##  O que ficou de fora
- **Rastreabilidade visual:**Funciona parcialmente e somente com pdfs puramente de texto, Clicar na célula e destacar o trecho exato no PDF via ocr exigiria mapear as bounding-boxes e coordenadas X/Y de cada palavra pelo Tesseract até o JSON final.
