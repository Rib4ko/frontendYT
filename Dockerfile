# Use official Node.js image as the base image
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) into the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files into the container
COPY . .

# Build the app for production
RUN npm run build

# Install the 'serve' package to serve the production build
RUN npm install -g serve

# Expose the port the app will run on
EXPOSE 5000

# Serve the production build using 'serve' on port 5000
CMD ["serve", "-s", "build", "-l", "5000"]
