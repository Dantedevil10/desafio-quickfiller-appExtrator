# Política de Retenção e Privacidade

- **O que guardamos:** O arquivo PDF original temporariamente durante a extração e o JSON final contendo as strings extraídas dos cartões de ponto e holerites.
- **Onde guardamos:** Os PDFs ficam no file system efêmero (`/uploads`) do backend. Os JSONs estruturados ficam cacheados em memória no banco de dados **Redis**.
- **Por quanto tempo:** 
  - Os PDFs são deletados **imediatamente** após o worker do BullMQ finalizar a extração via Tesseract/PDF.js (`fs.unlinkSync`).
  - O JSON da transcrição (via PUT) tem um `Time-To-Live (TTL)` no Redis de exatas **24 horas (86400 segundos)**, sendo expurgado automaticamente após esse período.
- **Privacidade e Logs:** Nenhum dado sensível (PII) é exposto no log do servidor. Em caso de falha, registramos apenas os IDs dos jobs e metadados de status estrutural (`Job 123 failed: O arquivo não pôde ser lido com clareza.`).


Para garantir a privacidade dos dados (PII) e a saúde do servidor, o arquivo PDF original é deletado permanentemente do disco (via fs.unlinkSync) no exato momento em que a extração termina. Os dados extraídos são mantidos em cache no Redis por apenas 24 horas (EX: 86400) para permitir a edição e o download pelo usuário, sendo expurgados automaticamente após esse período.
