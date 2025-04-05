import { Injectable } from '@nestjs/common';
import { CardResult } from '../../src/card-balance/models/card-result.model';

@Injectable()
export class PuppeteerService {
  async checkCardBalance(options: {
    cardNumber: string;
    pin: string;
    headless?: boolean;
    debug?: boolean;
    timeout?: number;
    maxRetries?: number;
  }): Promise<CardResult | null> {
    // Simulate the response based on input data
    // Add a small delay to simulate the async behavior
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Here we return mock data for testing
    if (options.cardNumber && options.pin) {
      return {
        balance: '45.00€',
        validityDate: '31/12/2024',
      };
    }

    // Return null for invalid inputs
    return null;
  }
}
