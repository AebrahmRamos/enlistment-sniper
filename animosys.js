const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;

async function enlist(classNbr) {
    let driver = await new webdriver.Builder().forBrowser('firefox').build();
    
    try {
        await driver.get('https://animo.sys.dlsu.edu.ph/');
        await driver.wait(until.elementLocated(By.css('#userid')), 10000);
        await driver.wait(until.elementLocated(By.css('#pwd')), 10000);
        
        await driver.findElement(By.css('#userid')).sendKeys('YOUR_ID_HERE');
        await driver.findElement(By.css('#pwd')).sendKeys('YOUR_PASSWORD_HERE');
        await driver.findElement(By.css('body > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td > table > tbody > tr:nth-child(1) > td.psloginframe > table:nth-child(3) > tbody > tr:nth-child(4) > td:nth-child(3) > input')).click();
        
        await driver.get('https://animo.sys.dlsu.edu.ph/psp/ps/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL?FolderPath=PORTAL_ROOT_OBJECT.CO_EMPLOYEE_SELF_SERVICE.HCCC_ENROLLMENT.HC_SSR_SSENRL_CART_GBL&IsFolder=false&IgnoreParamTempl=FolderPath%2cIsFolder');
        
        await driver.wait(until.elementLocated(By.css('#DERIVED_REGFRM1_CLASS_NBR')), 10000);
        await driver.findElement(By.css('#DERIVED_REGFRM1_CLASS_NBR')).sendKeys(classNbr);
        
        await driver.wait(until.elementLocated(By.xpath('//*[@id="DERIVED_REGFRM1_SSR_PB_ADDTOLIST2$70$"]')), 10000);
        await driver.findElement(By.xpath('//*[@id="DERIVED_REGFRM1_SSR_PB_ADDTOLIST2$70$"]')).click();
        
        await driver.wait(until.elementLocated(By.xpath('//*[@id="DERIVED_CLS_DTL_NEXT_PB$76$"]')), 10000);
        await driver.findElement(By.xpath('//*[@id="DERIVED_CLS_DTL_NEXT_PB$76$"]')).click();
        
        console.log(`Successfully enrolled in class ${classNbr}`);
    } catch (error) {
        console.error('An error occurred:', error);
        throw error;
    } finally {
        await driver.quit();
    }
}

module.exports = enlist;