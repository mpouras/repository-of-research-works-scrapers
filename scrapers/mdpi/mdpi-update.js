import api from "../../api.js";
import data from "./data.js";
import { processItems, navigateToPage } from "../utils.js";
import { fetchPublicationAndVolumes } from "./mdpi-publications-volumes.js";
import { fetchIssues } from "./mdpi-issues.js";
import { mdpiJournalsList } from "./mdpi-journals.js";
import fs from 'fs';

export const mdpiUpdate = async (page) => {
    const scraperName = 'mdpi';

    await mdpiJournalsList(page);
  
    const recent = await api.getRecent(scraperName);

    let publicationUpdates = await processItems(recent.slice(0, 1), async (publication) => {
        const publicationData = await fetchPublicationAndVolumes(page, publication);
        const existingVolume = publication.recent_volume;
        const newVolumes = existingVolume 
            ? publicationData.updates.volumes.filter(volume => parseInt(volume.number) > parseInt(existingVolume.number))
            : publicationData.updates.volumes;
        
        let volumeUpdates = await handleVolumeUpdate(existingVolume, newVolumes, publication, page);

        return {
            id: publication.id,
            volumes: volumeUpdates
        };
    });

    // fs.writeFileSync('publication-updates.json', JSON.stringify(publicationUpdates));
    if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
};

async function handleVolumeUpdate(existingVolume, newVolumes, publication, page) {
    let volumeUpdates = [];
    let articleId = publication.recent_article 
        ? parseInt(publication.recent_article?.match(/\/(\d+)$/)?.[1]) + 1
        : 1;

    if (existingVolume) {
        const updatedVolume = await processItems([existingVolume], async (volume) => {
            const issues = await handleIssueUpdate(page, publication, volume, articleId);

            return {
                name: volume.number,
                year_published: volume.year_published,
                issues
            };
        });
        volumeUpdates = [...volumeUpdates, ...updatedVolume];
    }

    if (newVolumes && newVolumes.length) {
        const newVolumeUpdates = await processItems(newVolumes, async (volume) => {
            const issues = await handleIssueUpdate(page, {
                ...publication,
                recent_issue: null,
                recent_volume: null
            }, volume, 1);     

            return {
                name: volume.number,
                year_published: volume.year_published,
                issues
            };
        });

        volumeUpdates = [...volumeUpdates, ...newVolumeUpdates];
    }

    return volumeUpdates;
}

async function handleIssueUpdate(page, publication, volume, startId = 1) {
    const { issues } = await fetchIssues(page, publication, volume);
    const existingIssue = publication.recent_issue;

    const isValid = issue => issue && issue.name && issue.month_published;

    if (!existingIssue) {
        return await fetchIssueArticles(issues.filter(isValid), page, publication, volume, 1);
    }

    const newIssues = issues.filter(
        issue =>
            isValid(issue) &&
            parseInt(issue.month_published) > parseInt(existingIssue.month_published)
    );

    const allIssues = [existingIssue, ...newIssues].filter(isValid);

    return await fetchIssueArticles(allIssues, page, publication, volume, startId);
}

async function fetchIssueArticles(issues, page, publication, volume, startId = 1) {
    return await processItems(issues, async (issue) => {
        const { articles } = await fetchArticlesByUrls(page, publication, volume, issue, startId);

        return {
            name: issue.name,
            month_published: issue.month_published,
            articles: articles
        };
    });
}

async function fetchArticlesByUrls(page, publication, volume, issue, startId = 1) {
    const issueUrl = `${process.env.BASE_URL_MDPI}/${publication.issn}/${volume.number}/${issue.name}`;
    if (!(await navigateToPage(page, issueUrl))) return { articles: [] };

    const articleUrls = await data.extractArticleUrls(page, startId);
    
    const articles = await processItems(articleUrls, async (articleUrl) => {
        if (!(await navigateToPage(page, articleUrl))) return null;

        let { notFound, article } = await data.extractArticle(page, articleUrl);
        if (notFound) return null;

        return article;
    });

    return { articles: articles.filter(Boolean) };
}