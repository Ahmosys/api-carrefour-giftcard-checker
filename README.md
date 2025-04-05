# 🛒 Carrefour Gift Card Verification API

<div align="center">
  <img src="docs/banner-readme.png" alt="banner" width="100%">
  <img src="https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white">
  <p>A simple, efficient, and robust API to verify the balance and validity of Carrefour gift cards.</p>
</div>

<br>


## 📋 Description

This API, built with the [NestJS](https://github.com/nestjs/nest) framework, allows automated checking of Carrefour gift card balances. It uses Puppeteer to scrape balance information directly from the official Carrefour website.

## 🌟 Features

- ✅ Gift card balance verification
- ✅ Card validity date checking
- ✅ Debug mode for troubleshooting
- ✅ Configurable retry attempts and timeouts
- ✅ Interactive API documentation via Swagger

## 🔧 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chromium (automatically installed with Puppeteer)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/api-carrefour-giftcard-checker.git
cd api-carrefour-giftcard-checker

# Install dependencies
npm install
```

## 🚀 Running the Project

```bash
# Development mode
npm run start

# Watch mode
npm run start:dev

# Production mode
npm run start:prod
```

The API will be accessible at: http://localhost:3000

Swagger Documentation: http://localhost:3000/api

## 🧪 Tests

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t carrefour-giftcard-api .

# Run the container
docker run -p 3000:3000 carrefour-giftcard-api
```

## 📌 API Usage

### Checking a Card Balance

```bash
curl -X POST http://localhost:3000/card-balance \
  -H 'Content-Type: application/json' \
  -d '{
    "cardNumber": "50320004304585671840123",
    "pin": "3301"
  }'
```

### Response

```json
{
  "balance": "25.00 €",
  "validityDate": "31/12/2025"
}
```

## 🏗️ Architecture

```
src/
├── card-balance/         # Gift card verification module
│   ├── dto/              # Data Transfer Objects
│   ├── models/           # Data models
│   ├── card-balance.controller.ts
│   └── card-balance.service.ts
├── core/                 # Core functionality
│   └── puppeteer/        # Puppeteer scraping service
├── shared/               # Shared resources
└── app.module.ts         # Main application module
```

## 📄 License

This project is licensed under the MIT License.
