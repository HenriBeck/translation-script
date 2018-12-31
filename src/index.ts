import puppeteer from 'puppeteer';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const SOURCE_LANGUAGE = 'de';
const TARGET_LANGUAGE = 'en';

const QUERY_SELECTOR = '.results-container .result-dict-wrapper .translation > span';

function createTranslationUrl(text) {
  return `https://translate.google.com/#view=home&op=translate&sl=${SOURCE_LANGUAGE}&tl=${TARGET_LANGUAGE}&text=${encodeURIComponent(text)}`;
}

async function translate(translations, browser) {
  const newTranslations = {};

  for (const key of Object.keys(translations)) {
    if (typeof translations[key] === 'object') {
      newTranslations[key] = await translate(translations[key], browser);
    } else if (translations[key].includes('{{')) {
      // Do not try to translate when it has a dynamic value
      newTranslations[key] = translations[key];
    } else {
      const page = await browser.newPage();
      await page.goto(createTranslationUrl(translations[key]));

      newTranslations[key] = await page.$eval(QUERY_SELECTOR, elem => elem.textContent);

      await page.close();
    }
  }

  return newTranslations;
}

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

(async () => {
  const browser = await puppeteer.launch();

  const inputFile = await readFile(path.join(process.cwd(), process.argv[2]), 'utf-8');

  const translatedFile = await translate(JSON.parse(inputFile), browser);

  await writeFile(path.join(process.cwd(), process.argv[3]), JSON.stringify(translatedFile), 'utf-8');

  await browser.close();
})();
