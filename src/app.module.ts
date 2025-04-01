import { Module } from '@nestjs/common';
import { CardBalanceModule } from '@/card-balance/card-balance.module';

@Module({
  imports: [CardBalanceModule],
})
export class AppModule {}
