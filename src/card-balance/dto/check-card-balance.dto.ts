import { IsString, Length, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckCardBalanceDto {
  @ApiProperty({
    example: '50320004304585671840371',
    description: 'The Carrefour gift card number.',
  })
  @IsString()
  @Length(10, 30)
  cardNumber!: string;

  @ApiProperty({
    example: '3301',
    description: 'The PIN code of the card.',
  })
  @IsString()
  @Length(4, 10)
  pin!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Run Puppeteer in headless mode (default: true).',
  })
  @IsOptional()
  @IsBoolean()
  headless?: boolean = true;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable debug logs (default: false).',
  })
  @IsOptional()
  @IsBoolean()
  debug?: boolean = false;

  @ApiPropertyOptional({
    example: 30000,
    description: 'Timeout for scraping operations (ms).',
  })
  @IsOptional()
  @IsNumber()
  timeout?: number = 30000;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of retries in case of failure.',
  })
  @IsOptional()
  @IsNumber()
  maxRetries?: number = 3;
}
