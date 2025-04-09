import api from "../../api.js";
import utils from "./utils.js";

export const acmPublications = async (page) => {
    console.log("Fetching publications for ACM...");
    const scraperName = 'acm';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = [];

    for (const publication of publications.slice(0,1)) {
        const { updates } = await navigateToPublication(page, publication);

        if (updates) publicationUpdates.push(updates);

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
};

async function navigateToPublication(page, publication) {
    const url = publication.link;
    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { timeout: 60000 });
        await utils.handleCookieDialog(page);

        const year_published = await getYearPublished(page);
        const issn = await getIssn(page);

        return { 
            id: publication.id,
            year_published, 
            issn 
        };
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
    }
}

async function getYearPublished(page) {
    try {
        const year_published = await page.evaluate(() => {
            const element = Array.from(document.querySelectorAll('.bibliometrics__title'))
                .find(el => el.textContent.includes('Publication Years'));

            if (element) {
                const countElement = element.closest('.bibliometrics__block')
                    .querySelector('.bibliometrics__count span');

                const years = countElement.textContent.trim().split(' - ');
                return years[0];
            }

            return null;
        });

        return year_published;
    } catch (error) {
        console.log('Error fetching year_published:', error.message)
    }
}

async function getIssn(page) {
    try {
        const issn = await page.evaluate(() => {
            const element = Array.from(document.querySelectorAll('.toc-badge__row'))
                .find(el => el.textContent.includes('ISSN'));

                if (element) {
                    const issnElement = element.querySelector('.toc-badge__value');
                    
                    return issnElement ? issnElement.textContent.trim() : null;
                }

            return null;
        });

        return issn;
    } catch (error) {
        console.log('Error fetching issn:', error.message)
    }
}