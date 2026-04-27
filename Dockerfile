FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the Vite frontend
RUN npm run build

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
