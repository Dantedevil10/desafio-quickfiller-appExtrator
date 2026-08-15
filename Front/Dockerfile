# Estágio 1: Build
FROM node:20-bullseye-slim as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Servidor Web Leve (Nginx)
FROM nginx:alpine
# Copia os arquivos compilados (ajuste "dist" para "build" se usar Create React App)
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]