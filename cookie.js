const { chromium } = require('playwright');

async function getCfClearance(url, timeout = 30000, headless = true) {
    const browser = await chromium.launch({ headless });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
    });
    const page = await context.newPage();

    try {
        console.log(`Navigating to ${url} to solve Cloudflare challenge...`);
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

        if (!response || !response.ok()) {
            throw new Error(`Failed to load URL: ${url}. Status: ${response ? response.status() : 'No response'}`);
        }

        // Wait for Cloudflare challenge to complete
        const clearanceCookie = await waitForClearanceCookie(context, timeout);

        if (!clearanceCookie) {
            throw new Error('Failed to obtain Cloudflare clearance cookie');
        }

        const userAgent = await page.evaluate(() => navigator.userAgent);
        console.log('Successfully obtained Cloudflare clearance cookie.');

        return {
            success: true,
            cookie: clearanceCookie.value,
            userAgent,
        };
    } catch (error) {
        console.error('Error solving Cloudflare challenge:', error);
        return {
            success: false,
            error: error.message,
        };
    } finally {
        await browser.close();
    }
}

async function waitForClearanceCookie(context, timeout) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const cookies = await context.cookies();
        const clearanceCookie = cookies.find((cookie) => cookie.name === 'cf_clearance');

        if (clearanceCookie) {
            return clearanceCookie;
        }

        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before retrying
    }

    return null;
}

module.exports = { getCfClearance };
