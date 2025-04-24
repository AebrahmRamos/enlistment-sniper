require('dotenv').config();
const { firefox } = require('playwright');

async function enlist(classNbr) {
    const userId = process.env.USER_ID;
    const password = process.env.PASSWORD;

    const browser = await firefox.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to Animo.sys login page
        console.log('Navigating to Animo.sys login page...');
        await page.goto('https://animo.sys.dlsu.edu.ph/');

        // Checking if still cloudflare challenge
        console.log('Waiting for Cloudflare challenge to complete...');
        await page.waitForLoadState('networkidle');

        console.log('Cloudflare challenge passed. Proceeding to login...');
        if (!userId || !password) {
            throw new Error('USER_ID or PASSWORD is not set in the .env file');
        }
        await page.fill('#userid', userId);
        await page.fill('#pwd', password);
        await page.click('input[type="submit"]');

        console.log('Navigating to enrollment cart page...');
        await page.goto('https://animo.sys.dlsu.edu.ph/psp/ps/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL');

        console.log(`Entering class number ${classNbr}...`);
        await page.fill('#DERIVED_REGFRM1_CLASS_NBR', classNbr);
        await page.click('#DERIVED_REGFRM1_SSR_PB_ADDTOLIST2$70$');

        console.log('Checking class availability...');
        const statusText = await page.textContent('#DERIVED_CLS_DTL_SSR_DESCRSHORT$0');

        if (statusText === 'open') {
            console.log('Class is open. Proceeding to next step...');
            await page.click('#DERIVED_CLS_DTL_NEXT_PB$76$');

            const successMessageText = await page.textContent('#DERIVED_SASSMSG_ERROR_TEXT$0');
            if (successMessageText.includes('has been added to your shopping cart')) {
                console.log('Class successfully added to shopping cart.');
            } else {
                console.log('Unexpected message:', successMessageText);
            }
        } else if (statusText === 'close') {
            console.log('Class is closed. Cancelling...');
            await page.click('#DERIVED_CLS_DTL_CANCEL_PB$75$');
            await page.click('#ICCancel');
        }

        // console.log('Proceeding to checkout...');
        // await page.click('#DERIVED_REGFRM1_LINK_ADD_ENRL$114$');

        // console.log('Finalizing enrollment...');
        // await page.click('#DERIVED_REGFRM1_SSR_PB_SUBMIT');

        // console.log(`Successfully enrolled in class ${classNbr}`);
    } catch (error) {
        console.error('An error occurred during the enrollment process:', error);
        throw error;
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

module.exports = enlist;