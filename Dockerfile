# Etapa 1: Construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Instalar dependencias
RUN cd backend && npm install
RUN cd frontend && npm install

# Copiar código fuente
COPY . .

# Compilar frontend
RUN cd frontend && npm run build

# Etapa 2: Servidor de Producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copiar backend y frontend compilado
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/package*.json ./

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
