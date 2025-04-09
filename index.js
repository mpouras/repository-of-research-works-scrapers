import { chromium } from 'playwright';
import './config.js';
import scrapers from './scrapers/index.js';

async function connectBrowser() {
    try {
        return await chromium.launch({ headless: true });
    } catch (error) {
        console.error("Failed to launch browser:", error.message);
        throw new Error("Browser connection error");
    }
}

async function setupPage(browser) {
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        });
        return page;
    } catch (error) {
        console.error("Error setting up the page:", error.message);
        throw new Error("Page setup error");
    }
}

async function executeScraper(scraperName, scraperFunction) {
    console.log(`Starting scraper: ${scraperName}`);
    let browser = null;

    try {
        browser = await connectBrowser();
        const page = await setupPage(browser);
        await scraperFunction(page);
        console.log(`Scraper completed: ${scraperName}`);
    } catch (error) {
        console.error(`Error during execution of scraper (${scraperName}):`, error.message);
    } finally {
        await browser?.close();
        console.log("Browser closed successfully");
    }
}

async function runScraper(scraperName) {
    const scraperFunction = scrapers[scraperName];
    if (!scraperFunction) {
        throw new Error(`Unsupported scraper: ${scraperName}`);
    }
    await executeScraper(scraperName, scraperFunction);
}

async function main() {
    const scraperToRun = process.argv[2];
    if (!scraperToRun || !scrapers[scraperToRun]) {
        console.error(`Invalid or missing scraper name. Supported scrapers are: ${Object.keys(scrapers).join(', ')}`);
        return;
    }
    await runScraper(scraperToRun);
}

async function retry(fn, { retries, minTimeout, onRetry }) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt < retries) {
                console.error(`Attempt ${attempt} failed, retrying...`);
                onRetry?.(error);
                await new Promise((res) => setTimeout(res, minTimeout));
            } else {
                console.error("All retry attempts failed.");
                throw error;
            }
        }
    }
}

retry(main, {
    retries: 3,
    minTimeout: 1000,
    onRetry: (err) => console.error('Retrying due to error:', err),
});
