FROM node:18-alpine

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

# Start the application
CMD ["node", "dist/main.js"]
