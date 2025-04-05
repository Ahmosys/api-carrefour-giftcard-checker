import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CardResult } from '../../src/card-balance/models/card-result.model';
import { PuppeteerService } from '../../src/core/puppeteer/puppeteer.service';
import { PuppeteerService as MockPuppeteerService } from '../mocks/puppeteer.service.mock';

// Type for validation error responses
interface ValidationErrorResponse {
  statusCode: number;
  message: string[];
  error: string;
}

describe('CardBalanceController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PuppeteerService)
      .useClass(MockPuppeteerService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /card-balance', () => {
    it('should return card balance data when valid credentials are provided', async () => {
      // Mock valid test data
      const validCardData = {
        cardNumber: '50320004304585671840371', // Example card number
        pin: '3301', // Example PIN
        headless: true,
        debug: false,
      };

      const response = await request(app.getHttpServer())
        .post('/card-balance')
        .send(validCardData)
        .expect(201);

      const result = response.body as CardResult;

      // Now we can assert exact values since we're using mocks
      expect(result).toBeDefined();
      expect(result.balance).toBe('45.00€');
      expect(result.validityDate).toBe('31/12/2024');
    });

    it('should validate required fields', async () => {
      // Missing required fields
      const invalidCardData = {
        // Missing cardNumber and pin
        headless: true,
      };

      const response = await request(app.getHttpServer())
        .post('/card-balance')
        .send(invalidCardData)
        .expect(400); // Bad Request due to validation failure

      const errorResponse = response.body as ValidationErrorResponse;
      expect(errorResponse).toHaveProperty('message');
      expect(Array.isArray(errorResponse.message)).toBeTruthy();
    });

    it('should validate card number length', async () => {
      const invalidCardData = {
        cardNumber: '123', // Too short
        pin: '3301',
      };

      const response = await request(app.getHttpServer())
        .post('/card-balance')
        .send(invalidCardData)
        .expect(400);

      const errorResponse = response.body as ValidationErrorResponse;
      expect(errorResponse).toHaveProperty('message');
      expect(Array.isArray(errorResponse.message)).toBeTruthy();
      expect(
        errorResponse.message.some((msg: string) => msg.includes('cardNumber')),
      ).toBeTruthy();
    });

    it('should validate pin length', async () => {
      const invalidCardData = {
        cardNumber: '50320004304585671840371',
        pin: '12', // Too short
      };

      const response = await request(app.getHttpServer())
        .post('/card-balance')
        .send(invalidCardData)
        .expect(400);

      const errorResponse = response.body as ValidationErrorResponse;
      expect(errorResponse).toHaveProperty('message');
      expect(Array.isArray(errorResponse.message)).toBeTruthy();
      expect(
        errorResponse.message.some((msg: string) => msg.includes('pin')),
      ).toBeTruthy();
    });
  });
});
