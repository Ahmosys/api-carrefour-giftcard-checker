import { Body, Controller, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CardBalanceService } from './card-balance.service';
import { CheckCardBalanceDto } from './dto/check-card-balance.dto';
import { CardResult } from './models/card-result.model';
import { CardsService } from '@/card.service';

@ApiTags('Card Balance')
@Controller('card-balance')
export class CardBalanceController {
  constructor(
    private readonly cardBalanceService: CardBalanceService,
    private readonly cardService: CardsService
  ) {}

  /**
   * Check Carrefour gift card balance
   */
  @Post()
  async checkBalance(@Body() dto: CheckCardBalanceDto): Promise<CardResult | null> {
    const data = await this.cardBalanceService.checkCardBalance(dto); // ✅ Attendre la réponse

    if (data) {
      await this.cardService.createCard({ 
        cardNumber: dto.cardNumber,  // ✅ Prend la valeur du dto
        pinCode: dto.pin,        // ✅ Prend la valeur du dto
        balance: data.balance,       // ✅ Prend la balance retournée
        validityDate: data.validityDate // ✅ Prend la validité retournée
      });
    }
  
    return data; // ✅ Retourner la réponse
  }

   /**
   * Get all cards from the database
   */
   @Get()
   getAllCards(): Promise<CardResult[]> {
     return this.cardService.cards({});
   }

}
