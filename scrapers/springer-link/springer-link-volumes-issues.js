import api from "../../api.js";
import '../../config.js';
import utils from './utils.js';

export const springerPublicationsVolumesIssues = async (page) => {
    console.log("Fetching volumes and issues for Springer...");
    const scraperName = 'springer';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    const defaultDomain = ["link.springer.com", "www.springer.com"];
    const secondaryDomain = ["springeropen.com"];

    let publicationUpdates = [];

    for (const publication of publications.slice(0,2)) {
        if (defaultDomain.some(substring => publication.link.includes(substring))) {
           const { updates } = await extractPublicationVolumesAndIssues(page, publication);

           if (updates) publicationUpdates.push(updates);

        } else if (secondaryDomain.some(substring => publication.link.includes(substring))) {
            // await extractSecondaryDomain
            console.log('Secondary Domain');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (publicationUpdates.length) await api.updatePublications(publicationUpdates);

};

async function extractPublicationVolumesAndIssues(page, publication) {
    const url = publication.link;
    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { timeout: 60000 });

        await utils.handleCookieDialog(page);

        const issn = await getIssn(page);
        const { volumesAndIssues, year_published } = await navigateToVolumesAndIssues(page, publication);
        
        return {
            updates: { 
                id: publication.id,
                year_published,
                issn,
                volumes: volumesAndIssues
            },
        }
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
    }
}

async function navigateToVolumesAndIssues(page, publication) {

    const url = `${publication.link}/volumes-and-issues`;
    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { timeout: 60000 });
        await utils.handleCookieDialog(page);

        const volumesAndIssues = await getVolumesIssues(page);
        const year_published = await getYearPublished(page);

        return {volumesAndIssues, year_published};
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
    }
}

async function getIssn(page) {
    try {
        const issn = await page.evaluate(() => {
            const issnElement = document.querySelector('.c-list-description__item[data-test="springer-print-issn"] dd.c-list-description__details');
            return issnElement ? issnElement.innerText.trim() : null;
        });

        return issn;
    } catch (error) {
        console.error('Error getting ISSN:', error.message);
    }
}

async function getYearPublished(page) {
    try {
        const year_published = await page.evaluate(() => {
            const year_published = document.querySelector('[data-test="volumes-and-issues"] li:last-child h2 time')?.innerText.split(' ').pop();
            return year_published;
        });

        return year_published;
    } catch (error) {
        console.error('Error getting year published:', error.message);
    }
}

async function getVolumesIssues(page) {
    try {
        const volumesAndIssues = await page.evaluate(() => {
            const volumeElements = document.querySelectorAll('[data-test="volumes-and-issues"] li');

            return Array.from(volumeElements).map(volumeElement => {
                let number = volumeElement.querySelector('h2 span:first-child')?.innerText.replace('Volume ', '').trim();
                const year_published = volumeElement.querySelector('h2 time')?.innerText.split(' ').pop();

                const issues = Array.from(volumeElement.querySelectorAll('.c-list-group__item')).map(issueElement => {
                    const name = issueElement.querySelector('a')?.innerText.replace('Issue ', '').trim();
                    const month = issueElement.querySelector('time')?.innerText.trim();
                    const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;
                    const month_published = monthNumber.toString();

                    return name && month_published ? { name, month_published } : null;
                }).filter(issue => issue !== null);

                if (!number || !year_published || issues.length === 0) {
                    return null; 
                }

                issues.sort((a, b) => a.name - b.name);
                return { number, year_published, issues };

            }).filter(volume => volume !== null).filter(volume => volume.year_published >= 2010);
        });

        volumesAndIssues.sort((a, b) => a.number - b.number);

        return volumesAndIssues;
    } catch (error) {
        console.error('Error fetching volume:', error.message);
        return null;
    }
}