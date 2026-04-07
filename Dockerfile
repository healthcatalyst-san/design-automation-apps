# Stage 1: Build the frontend
FROM node:22 AS builder

WORKDIR /app

# Install dependencies and build the Vite frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# Stage 2: Build the production server image
FROM node:22

WORKDIR /app

# The backend strictly needs Express, Dotenv, and Gemini SDK
# We explicitly install them here since package.json was missing them
RUN npm init -y && \
    npm install express dotenv @google/genai

# Copy server files directly to /app so `path.join(__dirname, 'dist')` aligns correctly
COPY server/ ./

# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "server.js"]
