import { Injectable, Logger } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CardResult } from '../../card-balance/models/card-result.model';
import { retryOperation } from '../../shared/utils/retry-operation';
import { typeHumanLike } from '../../shared/utils/type-human-like';
import { ScraperOptions } from './types/scraper-options.model';

puppeteer.use(StealthPlugin());

/**
 * Service responsible for scraping gift card balance information
 * using Puppeteer headless browser
 */
@Injectable()
export class PuppeteerService {
  private browser: Browser | null = null;
  private readonly logger = new Logger(PuppeteerService.name);
  private readonly CARREFOUR_CARD_URL =
    'https://www.cartecadeau.carrefour.fr/page/30/mes-cartes-cadeaux-carrefour';
  private readonly BROWSER_ARGS = [
    '--disable-gpu',
    '--no-sandbox',
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
    '--aggressive-cache-discard',
    '--disable-cache',
    '--disable-application-cache',
    '--disable-offline-load-stale-cache',
    '--disable-dev-shm-usage',
    '--disable-component-extensions-with-background-pages',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-extensions',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
  ];

  /**
   * Checks the balance of a Carrefour gift card
   * Main process that coordinates data scraping
   * @param options Configuration options for the scraper
   * @returns Result containing card balance and validity date, or null on failure
   */
  async checkCardBalance(options: ScraperOptions): Promise<CardResult | null> {
    const config = this.normalizeOptions(options);
    let result: CardResult | null = null;
    let page: Page | null = null;

    try {
      if (config.debug)
        this.logger.log(
          `[Init] Launching Puppeteer (headless: ${config.headless})`,
        );

      const browser = await this.getOrLaunchBrowser(config);
      page = await this.setupPage(browser, config);

      let attempts = 0;
      while (!result && attempts < config.maxRetries) {
        attempts++;
        if (config.debug)
          this.logger.log(`[Attempt ${attempts}] Starting balance check...`);

        try {
          result = await this.measurePerformance(
            () => this.performBalanceCheck(page as Page, config),
            'performBalanceCheck',
          );
        } catch (innerError) {
          this.handleRetryError(innerError, attempts, config);
          if (attempts < config.maxRetries) {
            await this.applyBackoff(attempts);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        '[Fatal] Unrecoverable error in scraping routine',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await page?.close();
      if (config.debug) this.logger.log('[Cleanup] Page closed');
    }

    return result;
  }

  async getOrLaunchBrowser(config: Required<ScraperOptions>): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      if (config.debug)
        this.logger.log('[Init] Browser already launched, using it');
      return this.browser;
    }
    this.browser = await this.launchBrowser(config);
    return this.browser;
  }

  /**
   * Normalizes input options by defining default values for missing options
   * @param options User-supplied options
   * @returns Normalized options with all properties defined
   */
  private normalizeOptions(options: ScraperOptions): Required<ScraperOptions> {
    return {
      headless: options.headless ?? true,
      debug: options.debug ?? false,
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      cardNumber: options.cardNumber,
      pin: options.pin,
    };
  }

  /**
   * Launches a Puppeteer browser instance with the appropriate configuration options
   * @param config Standard configuration options
   * @returns Puppeteer browser instance
   */
  private async launchBrowser(
    config: Required<ScraperOptions>,
  ): Promise<Browser> {
    return puppeteer.launch({
      headless: config.headless,
      args: this.BROWSER_ARGS,
    });
  }

  /**
   * Configures a new page in the browser with the necessary parameters
   * @param browser Puppeteer browser instance
   * @param config Configuration options
   * @returns Configured Puppeteer page
   */
  private async setupPage(
    browser: Browser,
    config: Required<ScraperOptions>,
  ): Promise<Page> {
    const page = await browser.newPage();
    page.setDefaultTimeout(config.timeout);
    page.setDefaultNavigationTimeout(config.timeout);

    if (config.debug) this.logger.log('[Init] New page created');

    await this.configurePage(page);
    return page;
  }

  /**
   * Configures specific page details such as user agent and request interception
   * @param page Puppeteer page to configure
   */
  private async configurePage(page: Page): Promise<void> {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      const blockedDomains = ['google-analytics.com', 'doubleclick.net'];

      if (
        ['image', 'font', 'media'].includes(resourceType) ||
        blockedDomains.some((domain) => url.includes(domain))
      ) {
        void request.abort();
      } else {
        void request.continue();
      }
    });
  }

  /**
   * Performs the entire card balance verification process
   * @param page Puppeteer page configured
   * @param config Configuration options
   * @returns Result containing card balance and validity date, or null on failure
   */
  private async performBalanceCheck(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<CardResult | null> {
    // Navigate to gift card page
    await page.goto(this.CARREFOUR_CARD_URL);

    if (config.debug) this.logger.log('[Step] Navigated to gift card page');

    await this.delay(this.getRandomDelay(600, 1300));

    // Open modal and enter card details
    await this.openCardModal(page, config);

    // Enter card number
    await this.enterCardNumber(page, config);

    // Enter PIN
    await this.enterCardPin(page, config);

    // Wait for and extract result
    return await this.waitForAndExtractResult(page, config);
  }

  /**
   * Opens the modal balance query dialog box
   * @param page Puppeteer page
   * @param config Configuration options
   */
  private async openCardModal(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<void> {
    await retryOperation(
      () => this.clickElement(page, 'a.modal-carte-detail'),
      config.maxRetries,
    );
    if (config.debug)
      this.logger.log('[Step] Clicked on balance consultation link');
  }

  /**
   * Fills in and submits card number
   * @param page Puppeteer page
   * @param config Configuration options with card number
   */
  private async enterCardNumber(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<void> {
    await page.waitForSelector('input[name="data[pan_carte]"]', {
      visible: true,
      timeout: config.timeout,
    });

    // Remove readonly attribute
    await page.evaluate(() => {
      const input = document.querySelector('input[name="data[pan_carte]"]');
      if (input) input.removeAttribute('readonly');
    });

    if (config.debug)
      this.logger.log('[Step] Unlocked card number input field');

    // Enter card number
    await typeHumanLike(
      page,
      'input[name="data[pan_carte]"]',
      config.cardNumber,
    );
    if (config.debug)
      this.logger.log(`[Input] Card number filled: ${config.cardNumber}`);

    // Submit card number
    await this.submitCardNumber(page, config);
  }

  /**
   * Submit the card number by clicking on the validation button
   * @param page Puppeteer page
   * @param config Configuration options
   */
  private async submitCardNumber(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<void> {
    await retryOperation(
      () =>
        page.evaluate(() => {
          const button = document.querySelector(
            'input[name="submitpan"]',
          ) as HTMLElement;
          if (!button) throw new Error('Card submit button not found');
          button.click();
        }),
      config.maxRetries,
    );
    if (config.debug) this.logger.log('[Step] Submitted card number');
  }

  /**
   * Fills in and submits card PIN code
   * @param page Puppeteer page
   * @param config Configuration options with PIN code
   */
  private async enterCardPin(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<void> {
    await page.waitForSelector('input[name="data[pin_carte]"]', {
      visible: true,
      timeout: config.timeout,
    });

    // Enter PIN
    await typeHumanLike(page, 'input[name="data[pin_carte]"]', config.pin);
    if (config.debug) this.logger.log(`[Input] PIN filled: ${config.pin}`);

    await this.delay(this.getRandomDelay(600, 1300));

    // Submit PIN
    await this.submitCardPin(page, config);
  }

  /**
   * Submit the PIN code by clicking on the validation button
   * @param page Puppeteer page
   * @param config Configuration options
   */
  private async submitCardPin(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<void> {
    await retryOperation(
      () =>
        page.evaluate(() => {
          const button = document.querySelector(
            'input[name="submitcaptcha"]',
          ) as HTMLElement;
          if (!button) throw new Error('PIN submit button not found');
          button.click();
        }),
      config.maxRetries,
    );
    if (config.debug) this.logger.log('[Step] Submitted PIN');
  }

  /**
   * Waits for results to be displayed and extracts balance and validity information
   * @param page Puppeteer page
   * @param config Configuration options
   * @returns Result containing balance and validity date, or null if data not available
   */
  private async waitForAndExtractResult(
    page: Page,
    config: Required<ScraperOptions>,
  ): Promise<CardResult | null> {
    await page.waitForSelector('.bkDetailResponse', {
      visible: true,
      timeout: config.timeout,
    });

    if (config.debug) this.logger.log('[Step] Waiting for result container...');

    const result = await this.extractCardResult(page);

    if (result) {
      this.logger.log(
        `[Success] Balance: ${result.balance}, Valid Until: ${result.validityDate}`,
      );
    } else {
      this.logger.warn('[Warn] Could not extract balance data');
    }

    return result;
  }

  /**
   * Handles errors during balance retrieval attempts
   * @param error Error occurred
   * @param attempt Current attempt number
   * @param config Configuration options
   */
  private handleRetryError(
    error: unknown,
    attempt: number,
    config: Required<ScraperOptions>,
  ): void {
    this.logger.warn(`[Retry ${attempt}] Failed attempt`);
    if (config.debug) {
      this.logger.error(
        `Detailed error:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Applies an exponential delay between attempts in case of failure
   * @param attempt Current attempt number
   */
  private async applyBackoff(attempt: number): Promise<void> {
    const delay = Math.pow(2, attempt) * 1000;
    this.logger.log(`[Backoff] Waiting ${delay}ms before retry`);
    await this.delay(delay);
  }

  /**
   * Click on a page element to simulate human interaction
   * @param page Page Puppeteer
   * @param selector CSS selector of the element to be clicked
   */
  private async clickElement(page: Page, selector: string): Promise<void> {
    await page.waitForSelector(selector, {
      visible: true,
    });
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${sel}`);
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }, selector);
    await this.delay(50);
    await page.click(selector);
    await this.delay(this.getRandomDelay(50, 200));
  }

  /**
   * Extract balance and validity date information from the result page
   * @param page Puppeteer page
   * @returns Object containing balance and validity date, or null if data not available
   */
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

  /**
   * Creates an execution delay for a specified time
   * @param ms Delay time in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates a random delay between two values to simulate human behavior
   * @param min Minimum delay value in milliseconds
   * @param max Maximum delay value in milliseconds
   * @returns Random delay in milliseconds
   */
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * Measures the execution time of an operation and records it
   * @param operation Function to execute and measure
   * @param label Descriptive label to identify the operation in logs
   * @returns The result of the operation
   */
  private async measurePerformance<T>(
    operation: () => Promise<T>,
    label: string,
  ): Promise<T> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    this.logger.debug(`[Performance] ${label}: ${duration}ms`);
    return result;
  }
}
