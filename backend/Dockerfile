# Use the Node.js image
FROM node:16

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the application code
COPY . .

# Build the application
RUN npm run build

# Expose the backend port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]