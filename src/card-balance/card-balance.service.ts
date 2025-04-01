import { Injectable } from '@nestjs/common';
import { CheckCardBalanceDto } from './dto/check-card-balance.dto';
import { CardResult } from './models/card-result.model';
import { PuppeteerService } from '../core/puppeteer/puppeteer.service';

@Injectable()
export class CardBalanceService {
  constructor(private readonly puppeteerService: PuppeteerService) {}

  /**
   * Check the balance of a Carrefour gift card using Puppeteer
   */
  async checkCardBalance(dto: CheckCardBalanceDto): Promise<CardResult | null> {
    return this.puppeteerService.checkCardBalance({
      cardNumber: dto.cardNumber,
      pin: dto.pin,
      headless: dto.headless,
      debug: dto.debug,
      timeout: dto.timeout,
      maxRetries: dto.maxRetries,
    });
  }
}
