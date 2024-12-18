# Use Node.js base image
FROM node:18

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port Cloud Run will use
ENV PORT 8080
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
