FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the Vite frontend
RUN npm run build

# Informational only — Cloud Run uses the --port flag from the deploy command.
# server.ts reads process.env.PORT at runtime, which Cloud Run injects dynamically.
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
