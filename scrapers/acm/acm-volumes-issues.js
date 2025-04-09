import api from "../../api.js";
import '../../config.js';
import utils from "./utils.js";

export const acmVolumesIssues = async (page) => {
    console.log("Fetching volumes and issues for ACM...");
    const scraperName = 'acm';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = [];

    for (const publication of publications.slice(0,1)) {
        const { updates } = await navigateToVolume(page, publication);

        if (updates) publicationUpdates.push(updates);

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(publicationUpdates);

    // if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
}

async function navigateToVolume(page, publication) {
    try {
        console.log(`Processing publication: ${publication.link}`);

        const sortedName = utils.getLastPathSegment(publication.link);
        let startYear = publication.year_published < 2010 ? 2010 : publication.year_published;
        const currentYear = new Date().getFullYear();

        if (publication.year_published === null) {
            const url = `${process.env.BASE_URL_ACM}/loi/${sortedName}`;
            await page.goto(url, { timeout: 60000 });
            startYear = await getStartYear(page);

            if (startYear === null) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const volumesAndIssues = [];
        for (let year = startYear; year <= currentYear; year++) {
        // for (let year = startYear; year <= 2012; year++) {
            let url = `${process.env.BASE_URL_ACM}/loi/${sortedName}/group/d${Math.floor(year / 10) * 10}.y${year}`;
            console.log(`Navigating to ${url}`);

            await page.goto(url, { timeout: 60000 });
            await utils.handleCookieDialog(page);

            let volumes = await getVolumesAndIssues(page, startYear); 
            volumes = volumes.filter(volume => volume.year_published == year);
            volumes.forEach(volume => {
                const existingVolumeIndex = volumesAndIssues.findIndex(v => v.number === volume.number);
                if (existingVolumeIndex !== -1) {
                    volumesAndIssues[existingVolumeIndex].issues.push(...volume.issues);
                } else {
                    volumesAndIssues.push(volume);
                }
            });
        }

        volumesAndIssues.forEach(volume => {
            volume.issues.sort((a, b) => parseInt(a.month_published) - parseInt(b.month_published));
        });
        volumesAndIssues.sort((a, b) => a.number - b.number);

        return {
            id: publication.id,
            year_published: startYear,
            volumes: volumesAndIssues
        }
    } catch (error) {
        console.error(`Error navigating volumes for publication ${publication.link}: ${error.message}`);
    }
}

async function getVolumesAndIssues(page) {
    try {
        await page.waitForSelector('.loi__vol-title.left-bordered-title', { timeout: 30000 });

        const volumesAndIssues = await page.evaluate(() => {
            const volumeElements = document.querySelectorAll('.loi__vol-title.left-bordered-title');
            return Array.from(volumeElements).map(element => {
                const text = element.textContent.trim();
                const match = text.match(/(\d{4}),\s*Volume\s*(\d+)/);

                const year_published = parseInt(match[1], 10);
                const number = parseInt(match[2], 10);

                const issuesList = element.nextElementSibling.querySelectorAll('.loi__issue');

                const issues = [];
                issuesList.forEach(issue => {
                    const dateElement = issue.querySelector('.coverDate');
                    const issueNameElement = issue.querySelector('.issue');

                    if (dateElement && issueNameElement) {
                        const dateText = dateElement.textContent.trim();
                        const name = issueNameElement.textContent.replace('Issue ', '').trim();

                        const month = dateText.split(' ')[0];
                        const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;
                        const month_published = monthNumber.toString();

                        issues.push({ name, month_published });
                    } else if (!issueNameElement) {
                        issues.push({ name: "1", month_published: "1" });
                    }
                });

                return { number, year_published, issues };
            });
        });

        return volumesAndIssues;
    } catch (error) {
        console.error('Error fetching volumes:', error.message);
        return [];
    }
}

async function getStartYear(page) {
    try {
        await page.waitForSelector('.loi__list.tab__nav.swipe__list', { timeout: 3000 });

        const result = await page.evaluate(() => {
            const yearElements = Array.from(document.querySelectorAll('.loi__list.tab__nav.swipe__list > li > a'))
                .map(item => {
                    const ariaLabel = item.getAttribute('aria-label');
                    if (ariaLabel && ariaLabel.startsWith('select year')) {
                        
                        return parseInt(ariaLabel.match(/\d{4}/)[0], 10);
                    }
                    return null;
                })
                .filter(Boolean)
                .filter(year => year >= 2010);

            return yearElements;
        });

        const startYear = result.length > 0 ? Math.min(...result) : null;
        return startYear;

    } catch (error) {
        console.log("Error in getStartYear:", error.message);
        return null;
    }
}