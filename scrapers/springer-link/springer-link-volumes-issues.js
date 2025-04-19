import api from "../../api.js";
import '../../config.js';
import data from "./data.js";
import utils from './utils.js';
import { processItems, navigateToPage } from "../utils.js";

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

    let publicationUpdates = await processItems(publications, async (publication) => {
        if (defaultDomain.some(substring => publication.link.includes(substring))) {
            const { updates } = await fetchPublicationVolumesAndIssues(page, publication);

            return updates;
        }
    });

    if (publicationUpdates.length) {
        const batchSize = 50;
        for (let i = 0; i < publicationUpdates.length; i += batchSize) {
            const batch = publicationUpdates.slice(i, i + batchSize);
            await api.updatePublications(batch);
            console.log(`Updated batch from ${i + 1} to ${i + batchSize}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('All publication updates completed.');
    } else {
        console.log('No updates to process.');
    }
};

async function fetchPublicationVolumesAndIssues(page, publication) {
    const url = publication.link;
    try {
        if (!(await navigateToPage(page, url ))) return {};
        await utils.handleCookieDialog(page);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const issn = await data.extractIssn(page);
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

    try {
        if (!(await navigateToPage(page, url ))) return {};
        await utils.handleCookieDialog(page);

        const volumesAndIssues = await data.extractVolumesIssues(page);
        const year_published = await data.extractYearPublished(page);

        return {volumesAndIssues, year_published};
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
    }
}