import { Module } from '@nestjs/common';
import { CardBalanceController } from './card-balance.controller';
import { CardBalanceService } from './card-balance.service';
import { PuppeteerService } from '@/core/puppeteer/puppeteer.service';
import { CardsService } from '@/card.service';
import { PrismaService } from '@/prisma.service';

@Module({
  controllers: [CardBalanceController],
  providers: [CardBalanceService, PuppeteerService, CardsService, PrismaService],
})
export class CardBalanceModule {}
