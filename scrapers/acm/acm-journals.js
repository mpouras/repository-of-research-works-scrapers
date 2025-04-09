import api from "../../api.js";
import utils from "./utils.js";

export const acmJournalsList = async (page) => {
    const url = `${process.env.BASE_URL_ACM}/journals`;
    await page.goto(url, { timeout: 60000 });

    await utils.handleCookieDialog(page);
    await utils.scrollToLoadMore(page);

    const publications = await extractPublications(page);
    
    await api.storePublications(publications);
}

async function extractPublications(page) {
    try {
        await page.waitForSelector('.search__item', { timeout: 30000 });

        return await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.search__item'));
            
            return items.map(item => {
                const titleElement = item.querySelector('.search__item-title .browse-title');
                 
                let matchedPublishers = titleElement.innerText.match(/\b[A-Z]{2,}\b/g) || []; 
                matchedPublishers = matchedPublishers.filter(word => word !== "AI"); 
                const publishers = matchedPublishers.length > 0 
                    ? matchedPublishers.map(publisher => ({ name: publisher, scraper: 'acm' })) 
                    : [{ name: 'ACM', scraper: 'acm' }];
                
                const title = titleElement.innerText;
                const link = item.querySelector('.search__item-title a').href;
                const description = item.querySelector('.meta__abstract').innerText;

                const type = "Journal";

                return { publishers, title, link, description, type };
            });
        });
    } catch (error) {
        console.error("Error extracting ACM results:", error);
        return [];
    }
}