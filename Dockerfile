# Dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-bullseye-slim AS base

# Set environment variables for ONNX Runtime CPU installation
ENV npm_config_onnxruntime_cpu=true
ENV ONNXRUNTIME_PROVIDER=cpu

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (these should reflect onnxruntime-node 1.16.3 after local update)
COPY package.json ./
COPY package-lock.json ./

# Clean npm cache
RUN npm cache clean --force

# Install all other dependencies based on the lock file
# This will install onnxruntime-node 1.16.3 (CPU) as per the updated lock file and ENV vars
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM node:18-bullseye-slim AS production

WORKDIR /app

# Copy built assets from the build stage
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json
# If you have a custom server, copy it as well
# COPY --from=base /app/server.js ./server.js
COPY --from=base /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the app
ENV NODE_ENV=production
CMD ["npm", "start"]
