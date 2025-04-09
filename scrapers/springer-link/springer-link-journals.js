import api from "../../api.js";
import utils from './utils.js';

export const springerJournalsList = async (page) => {
    const url = `${process.env.BASE_URL_SPRINGER}/journals/browse-subject?subject=COMPUTER_SCIENCE&sortBy=&page=`;
    await page.goto(url + "1", { timeout: 60000 });

    await utils.handleCookieDialog(page);

    const totalPages = await utils.calculateTotalPages(page);
    const publicationsList = await scrapeAllPages(page, url, totalPages);

    await api.storePublications(publicationsList);
};

async function scrapeAllPages(page, url, totalPages) {
    let publicationsList = [];

    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        console.log(`Scraping page ${currentPage} of ${totalPages}`);

        if (currentPage > 1) {
            await page.goto(url + currentPage, { timeout: 60000 });
        }

        const extractedPublications = await extractPublicationsPageSpringer(page);
        
        const allowedDomains = ["link.springer.com", "www.springer.com", "springeropen.com"]
        
        const publications = extractedPublications.filter(publication =>
            allowedDomains.some(domain => publication.link.includes(domain))
        );
        publicationsList = publicationsList.concat(publications);

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return publicationsList;
}

async function extractPublicationsPageSpringer(page) {
    try {
        const results = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.app-card-open'));

            return rows.map(row => {
                const titleElement = row.querySelector('.app-card-open__heading');
                const descriptionElement = row.querySelector('.app-card-open__description p');

                const title = titleElement.innerText;
                const link = titleElement.querySelector('a')?.href;
                const description = descriptionElement ? descriptionElement.textContent.replace(/\s+/g, ' ').trim() : null;
                const publishers = [
                    {
                        name: "Springer Nature",
                        scraper: "springer"
                    }
                ];
                const type = "Journal";

                return { publishers, title, description, link, type };
            }).filter(item => item !== null);
        });

        return results;
    } catch (error) {
        console.error("Error extracting MDPI results:", error);
        return [];
    }
}