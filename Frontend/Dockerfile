# Frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the dev server port (1234 is used by dev.mjs)
EXPOSE 1234

# Start the development server and expose it to the network
# The dev.mjs script defaults to host 0.0.0.0, so no need to pass it explicitly
CMD ["npm", "run", "dev"]