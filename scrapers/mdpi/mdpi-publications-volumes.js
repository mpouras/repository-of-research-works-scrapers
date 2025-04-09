import api from "../../api.js";
import { processItems, navigateToPage } from "../utils.js";
import data from "./data.js"

export const mdpiPublicationsVolumes = async (page) => {
    console.log("Fetching publications and volumes for MDPI...");
    const scraperName = 'mdpi'

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = await processItems(publications, async (publication) => {
        const { updates } = await fetchPublicationAndVolumes(page, publication);
        return updates;
    });

    if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
};

export async function fetchPublicationAndVolumes(page, publication) {
    if (!(await navigateToPage(page, publication.link))) return {};

    const description = await data.extractDescription(page);
    const volumes = await data.extractVolumes(page);

    return { updates: { id: publication.id, description, volumes } };
}