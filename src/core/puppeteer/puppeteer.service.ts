import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CardResult } from '../../card-balance/models/card-result.model';
import { ScraperOptions } from './types/scraper-options.model';
import { retryOperation } from '../../shared/utils/retry-operation';
import { typeHumanLike } from '../../shared/utils/type-human-like';

puppeteer.use(StealthPlugin());

@Injectable()
export class PuppeteerService {
  private readonly logger = new Logger(PuppeteerService.name);

  async checkCardBalance(options: ScraperOptions): Promise<CardResult | null> {
    const config: ScraperOptions = {
      headless: options.headless ?? true,
      debug: options.debug ?? false,
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      cardNumber: options.cardNumber,
      pin: options.pin,
    };

    const maxRetries = config.maxRetries ?? 3;

    let browser: Browser | null = null;
    let result: CardResult | null = null;

    try {
      if (config.debug)
        this.logger.log(`[Init] Launching Puppeteer (headless: ${config.headless})`);

      browser = await puppeteer.launch({
        headless: config.headless,
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-extensions',
          '--disable-setuid-sandbox',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-first-run',
          '--no-zygote',
        ],
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(config.timeout ?? 30000);
      page.setDefaultNavigationTimeout(config.timeout ?? 30000);

      if (config.debug) this.logger.log('[Init] Browser launched, new page created');

      await this.configurePage(page);

      let attempts = 0;

      while (!result && (attempts < maxRetries)) {
        attempts++;

        if (config.debug) this.logger.log(`[Attempt ${attempts}] Starting balance check...`);

        try {
          await page.goto('https://www.cartecadeau.carrefour.fr/page/30/mes-cartes-cadeaux-carrefour');
          if (config.debug) this.logger.log('[Step] Navigated to gift card page');

          await retryOperation(() => this.clickElement(page, 'a.modal-carte-detail'), maxRetries);
          if (config.debug) this.logger.log('[Step] Clicked on balance consultation link');

          await page.waitForSelector('input[name="data[pan_carte]"]', { visible: true });
          await page.evaluate(() => {
            const input = document.querySelector('input[name="data[pan_carte]"]');
            if (input) input.removeAttribute('readonly');
          });

          if (config.debug) this.logger.log('[Step] Unlocked card number input field');

          await typeHumanLike(page, 'input[name="data[pan_carte]"]', config.cardNumber);
          if (config.debug) this.logger.log(`[Input] Card number filled: ${config.cardNumber}`);

          await retryOperation(() => page.evaluate(() => {
            const button = document.querySelector('input[name="submitpan"]') as HTMLElement;
            if (!button) throw new Error('Card submit button not found');
            button.click();
          }), maxRetries);
          if (config.debug) this.logger.log('[Step] Submitted card number');

          await page.waitForSelector('input[name="data[pin_carte]"]', { visible: true });
          await typeHumanLike(page, 'input[name="data[pin_carte]"]', config.pin);
          if (config.debug) this.logger.log(`[Input] PIN filled: ${config.pin}`);

          await this.delay(this.getRandomDelay(600, 1300));

          await retryOperation(() => page.evaluate(() => {
            const button = document.querySelector('input[name="submitcaptcha"]') as HTMLElement;
            if (!button) throw new Error('PIN submit button not found');
            button.click();
          }), maxRetries);
          if (config.debug) this.logger.log('[Step] Submitted PIN');

          await page.waitForSelector('.bkDetailResponse', {
            visible: true,
            timeout: config.timeout,
          });

          if (config.debug) this.logger.log('[Step] Waiting for result container...');

          result = await this.extractCardResult(page);

          if (result) {
            this.logger.log(`[Success] Balance: ${result.balance}, Valid Until: ${result.validityDate}`);
          } else {
            this.logger.warn('[Warn] Could not extract balance data');
          }
        } catch (innerError) {
          this.logger.warn(`[Retry ${attempts}] Failed attempt`);
          if (config.debug) {
            this.logger.error(`Detailed error:`, innerError instanceof Error ? innerError.stack : String(innerError));
          }

          if (attempts < maxRetries) {
            const delay = Math.pow(2, attempts) * 1000;
            this.logger.log(`[Backoff] Waiting ${delay}ms before retry`);
            await this.delay(delay);
          }
        }
      }
    } catch (error) {
      this.logger.error('[Fatal] Unrecoverable error in scraping routine', error instanceof Error ? error.stack : String(error));
    } finally {
      await browser?.close();
      if (config.debug) this.logger.log('[Cleanup] Browser closed');
    }

    return result;
  }

  private async configurePage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  private async clickElement(page: Page, selector: string): Promise<void> {
    await page.waitForSelector(selector, { visible: true });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${sel}`);
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, selector);
    await this.delay(50);
    await page.click(selector);
    await this.delay(this.getRandomDelay(50, 200));
  }

  private async extractCardResult(page: Page): Promise<CardResult | null> {
    return page.evaluate(() => {
      const responseDiv = document.querySelector('.bkDetailResponse');
      if (!responseDiv) return null;

      const lines = (responseDiv as HTMLElement).innerText.split('\n');
      const result: CardResult = { balance: null, validityDate: null };

      for (const line of lines) {
        if (line.includes('Crédit restant')) {
          result.balance = line.replace('Crédit restant :', '').trim();
        } else if (line.includes('Date de validité')) {
          result.validityDate = line.replace('Date de validité :', '').trim();
        }
      }

      return result;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}
