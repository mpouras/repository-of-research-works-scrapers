import api from "../../api.js";
import '../../config.js';
import { processItems, navigateToPage } from "../utils.js";
import data from "./data.js";
import fs from 'fs';

export const mdpiIssues = async (page) => {
    console.log("Fetching issues for MDPI...");
    const scraperName = "mdpi";

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = await processItems(publications, async (publication) => {
        let volumes = await api.getVolumes(publication.id);
        
        let issueUpdates = await processItems(volumes, async (volume) => {
            const { number, issues } = await fetchIssues(page, publication, volume);

            return {
                number,
                issues
            };
        });
    
        return { 
            id: publication.id, 
            volumes: issueUpdates 
        };
    });
    
    if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
}

export async function fetchIssues(page, publication, volume) {
    let url = `${process.env.BASE_URL_MDPI}/${publication.issn}/${volume.number}`;
    if (!(await navigateToPage(page, url))) return null;

    let issues = await data.extractIssues(page);
    return { number: volume.number, issues };
}