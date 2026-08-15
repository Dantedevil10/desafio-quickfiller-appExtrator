# Processo e Uso de IA

Conforme solicitado no desafio, este documento detalha a condução da arquitetura e o uso de agentes ao longo do desenvolvimento.

## Uso de Ferramentas (IA)

Utilizei (Gemini) como parceiro de pair-programming focados em infraestrutura e Regex:
1. **Orquestração Docker:** Geração do `docker-compose.yml` e ajuste fino dos `Dockerfiles`, especialmente na compilação do Angular servido via Nginx.
2. **Regex de Extração:** Criação das expressões regulares massivas para isolar horários (`\b[0-2]?[0-9]:[0-5][0-9]\b`) e capturar moedas brasileiras sem perdê-las na conversão para float.
3. **Setup do BullMQ:** Estruturação inicial do Server e do Worker conversando via Redis.

## Onde o Agente Errou / Caminhos Errados

1. **Vazamento de Contexto no Docker:** A IA sugeriu copiar o `nginx.conf` da raiz do projeto, mas o contexto de build do Frontend era isolado. O Docker falhava com `not found`. Corrigi movendo o arquivo para a subpasta e ajustando os caminhos.
2. **Esquecimento da Limpeza:** Na primeira iteração do Worker, a IA não incluiu um bloco `finally` para deletar o arquivo do disco em caso de erro no Tesseract. Notei o HD enchendo nos testes e reescrevi o worker embutindo o `fs.unlinkSync` num bloco que roda independentemente de *try/catch*.
3. **Conexão Redis:** O agente sugeriu `redis://localhost:6379`. Dentro do Docker compose, um contêiner não enxerga o outro no *localhost*. Alterei manualmente para injetar variáveis de ambiente (`process.env.REDIS_URL`) apontando para a rede interna do Docker (`redis://redis:6379`).
4. **Falhas e logs:** O agente muitas vezes piora o codigo, então eu testo todas as alterações e junto as melhores respostas para sempre manter o progresso, as vezes a IA nao sabia oq fazer para melhorar regex por falta de informações sobre os dados, isso foi resolvido com logs de debug que ainda
permanecem no codigo caso for preciso

## Respostas às Perguntas do Edital

**1. Cite 3 decisões em que havia mais de uma resposta razoável. Por que escolheu essa?**
- **Tratamento de Incertezas no OCR (O "?"):** Havia a opção de forçar uma heurística complexa para advinhar se `0B:25` era um horário distorcido e marcá-lo como `0?:25`. Optei por um Regex estrito: se estiver completamente ilegível a ponto de misturar letras e números nas horas, a batida é ignorada. Prefiro que o dia caia na regra de "Batidas Ímpares" do que gerar falsos positivos perigosos.
- **Processamento:** Havia a opção de usar `await` simples no request HTTP (mais rápido de codar). Escolhi gastar tempo implementando uma fila no Redis para evitar timeout da plataforma em PDFs demorados.
- **Identificação de Campos de Holerite:** Havia a opção de mapear o layout por coordenadas XY (absolutas). Escolhi extrair por âncoras de texto e regex condicional, pois coordenadas quebram se o documento for ligeiramente deslocado no scanner.

**2. O que na sua solução quebra primeiro em produção?**
O teto de memória RAM no Render. Como estamos no *Free Tier* (512MB), o envio de um arquivo PDF puramente escaneado com muitas páginas (ex: 30+) ou com DPI excessivo fará o Tesseract/Canvas processar as imagens simultaneamente em memória, causando um erro de `OOM (Out Of Memory)`.

**3. Onde você não confia no que entregou?**
Na extração de holerites extremamente exóticos ou planilhas que foram rotacionadas no escaneamento. Como o extrator baseia a captura na proximidade vertical e horizontal do texto nativo, quebras severas de tabulação podem fazer o Regex associar o valor financeiro da linha de baixo à rubrica da linha de cima.
