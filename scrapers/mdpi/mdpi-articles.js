import api from "../../api.js";
import '../../config.js';
import { processItems, navigateToPage } from "../utils.js";
import data from "./data.js";
import fs from 'fs';

export const mdpiArticles = async (page) => {
    console.log("Fetching issues for MDPI...");
    const scraperName = "mdpi";

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = await processItems(publications.slice(55,74), async (publication) => {
        let volumes = await api.getVolumes(publication.id);
        
        await processItems(volumes, async (volume) => {
            let issues = await api.getIssues(publication.id, volume.number);

            await processItems(issues, async (issue) => {
                const url = `${process.env.BASE_URL_MDPI}/${publication.issn}/${volume.number}/${issue.name}`;
                if (!(await navigateToPage(page, url))) return null;
                const articleUrls = await data.extractArticleUrls(page);

                let articles = await processItems(articleUrls, async (articleUrl) => {
                    if (!(await navigateToPage(page, articleUrl))) return null;

                    let { notFound, article } = await data.extractArticle(page, articleUrl);
                    if (notFound) return null;

                    return article;
                }, 1500);

                // fs.writeFileSync('publication-updates.json', JSON.stringify(articles));
                await api.storeArticles(articles, publication.id, volume.number, issue.name);
            });
        });
    });
}