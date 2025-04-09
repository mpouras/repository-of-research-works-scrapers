
async function handleCookieDialog(page) {
    try {
        await page.waitForSelector('#CybotCookiebotDialogBody', { timeout: 3000 });
        await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection');
        await page.waitForTimeout(2000);
    } catch (error) {
        console.log("Cookie dialog not found or already handled.");
    }
}

async function scrollToLoadMore(page) {
    let previousHeight = 0;
    try {
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            console.log("Scrolled to the bottom...");

            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) {
                console.log("No more content to load.");
                break;
            }
        }
    } catch (error) {
        console.log("Error during infinite scrolling:", error);
    }
}

function getLastPathSegment(url) {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/');
    return pathSegments[pathSegments.length - 1];
}

export default {
    handleCookieDialog,
    scrollToLoadMore,
    getLastPathSegment
};