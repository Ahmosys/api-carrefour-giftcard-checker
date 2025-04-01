import { Page } from 'puppeteer';

export async function typeHumanLike(
  page: Page,
  selector: string,
  text: string,
): Promise<void> {
  await page.$eval(selector, (el: any) => (el.value = ''));
  for (const char of text) {
    await page.type(selector, char, {
      delay: Math.floor(Math.random() * 100) + 30,
    });
    if (Math.random() < 0.2) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 300) + 100),
      );
    }
  }
}
