let cookieDialogHandled = false;

async function handleCookieDialog(page) {
    if (cookieDialogHandled) return;

    try {
        await page.waitForSelector('.cc-banner__content', { timeout: 5000 });
        await page.click('.cc-banner__button-reject');
        cookieDialogHandled = true;
        console.log("Cookie dialog handled successfully.");
    } catch (error) {
        console.log("Cookie dialog not found or already handled.");
        cookieDialogHandled = true;
    }
}

async function calculateTotalPages(page) {
    try {
        const totalResultsText = await page.$eval( 'span[data-test="results-data-total"]', element => element.innerText );

        const totalResultsMatch = totalResultsText.match(/of (\d+)/);
        if (totalResultsMatch) {
            const totalResults = parseInt(totalResultsMatch[1], 10);
            const resultsPerPage = 20;
            return Math.ceil(totalResults / resultsPerPage);
        }
        console.error("Could not parse total results.");
        return 1;
    } catch (error) {
        console.error("Error calculating total pages:", error);
        return 1;
    }
}

export default {
    handleCookieDialog, 
    calculateTotalPages
};