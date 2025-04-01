import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CardBalanceService } from './card-balance.service';
import { CheckCardBalanceDto } from './dto/check-card-balance.dto';
import { CardResult } from './models/card-result.model';

@ApiTags('Card Balance')
@Controller('card-balance')
export class CardBalanceController {
  constructor(private readonly cardBalanceService: CardBalanceService) { }
  /**
   * Check Carrefour gift card balance
   */
  @Post()
  async checkBalance(
    @Body() dto: CheckCardBalanceDto,
  ): Promise<CardResult | null> {
    return this.cardBalanceService.checkCardBalance(dto);
  }
}
