# Use official Node.js image
FROM node:16

# Set work directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json /app/
RUN npm install

# Copy the rest of the code
COPY . /app

# Expose port for React app
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
