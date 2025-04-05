# Use official Node.js image
FROM node:20-slim

# Set the environment variable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_BIN=/usr/bin/google-chrome
ENV NODE_ENV=production

# Install necessary dependencies for Puppeteer (for Chromium)
# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install google-chrome-stable -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including Puppeteer)
RUN npm install

# Install Nest CLI globally
RUN npm install -g @nestjs/cli

# Copy the rest of your app
COPY . .

# Build your NestJS app
RUN npm run build

# Expose the app port
EXPOSE 3000

# Run the app
CMD ["node", "dist/main"]
