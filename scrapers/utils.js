async function processItems(items, processFn, delay = 2000) {
    let results = [];
    for (const item of items) {
        const result = await processFn(item);
        if (result) results.push(result);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return results;
}

async function navigateToPage(page, url) {
    try {
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { timeout: 60000 });
        return true;
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
        return false;
    }
}

export {
    processItems,
    navigateToPage
}