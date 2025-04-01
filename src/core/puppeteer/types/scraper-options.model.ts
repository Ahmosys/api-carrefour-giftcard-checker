export interface ScraperOptions {
  cardNumber: string;
  pin: string;
  headless?: boolean;
  debug?: boolean;
  timeout?: number;
  maxRetries?: number;
}
