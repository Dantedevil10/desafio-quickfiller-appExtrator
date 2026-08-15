FROM node:20-bullseye-slim

# Dependências de sistema (necessárias para o Tesseract/Canvas que fizemos antes)
RUN apt-get update && apt-get install -y \
    build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

# O comando padrão será o do Render. O docker-compose vai sobrescrever isso localmente.
CMD ["npm", "run", "start:render"]