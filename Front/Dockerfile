# Estágio 1: Build
FROM node:20-bullseye-slim as builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./
RUN npm install

# Copia o resto do código (src, public, angular.json, etc)
COPY . .

# Roda o build de produção do Angular
RUN npm run build --configuration=production

# Estágio 2: Servidor Web Leve (Nginx)
FROM nginx:alpine

# Copia os arquivos da pasta correta gerada pelo seu angular.json
COPY --from=builder /app/dist/quick-filler-interface/browser /usr/share/nginx/html

# Copia a configuração de rotas do Angular para o Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]