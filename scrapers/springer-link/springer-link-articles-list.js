import api from "../../api.js";
import '../../config.js';
import utils from './utils.js';
import { processItems, navigateToPage } from "../utils.js";
import data from "./data.js";

export const springerArticlesList = async (page) => {
    console.log("Fetching articles for Springer...");
    const scraperName = 'springer';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    let publicationUpdates = await processItems(publications.slice(0,1), async (publication) => {
        let volumes = await api.getVolumes(publication.id);
        
        await processItems(volumes.slice(14,15), async (volume) => {
            let issues = await api.getIssues(publication.id, volume.number);

            await processItems(issues.slice(4,5), async (issue) => {
                const url = `${publication.link}/volumes-and-issues/${volume.number}-${issue.name}`;
                if (!(await navigateToPage(page, url))) return null;
                await utils.handleCookieDialog(page);
                
                const articleUrls = await data.extractArticleUrls(page);

                let articles = await processItems(articleUrls, async (articleUrl) => {
                    if (!(await navigateToPage(page, articleUrl))) return null;
                    await utils.handleCookieDialog(page);

                    const article = await data.extractArticle(page, articleUrl);
                    return article;
                });

                await api.storeArticles(articles, publication.id, volume.number, issue.name);
            });
        });
    });
};