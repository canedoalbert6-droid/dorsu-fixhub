# Use Node.js LTS version
FROM node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Ensure upload directory exists
RUN mkdir -p uploads && chmod 777 uploads

# Use the port assigned by Google Cloud
ENV PORT 8080
EXPOSE 8080

# Start the application
CMD [ "node", "server.js" ]
