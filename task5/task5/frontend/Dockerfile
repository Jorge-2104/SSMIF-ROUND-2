# Use Node.js as a parent image
FROM node:16-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the client's files
COPY . .

# Build the Next.js project
RUN npm run build

# Expose port 3000 to the outside once the container has launched
EXPOSE 3000

# Run the server using npm
CMD ["npm", "start"]
