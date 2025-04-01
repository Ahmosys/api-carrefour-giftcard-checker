import { Module } from '@nestjs/common';
import { CardBalanceController } from './card-balance.controller';
import { CardBalanceService } from './card-balance.service';
import { PuppeteerService } from '@/core/puppeteer/puppeteer.service';

@Module({
  controllers: [CardBalanceController],
  providers: [CardBalanceService, PuppeteerService],
})
export class CardBalanceModule {}
