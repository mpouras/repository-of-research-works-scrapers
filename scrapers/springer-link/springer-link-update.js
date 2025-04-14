import { springerJournalsList } from "./springer-link-journals.js";
import { navigateToPage, processItems } from "../utils.js";
import fs from 'fs';
import api from "../../api.js";
import utils from "./utils.js";
import data from "./data.js";

export const springerUpdate = async (page) => {
    const scraperName = 'springer';

    await springerJournalsList(page);

    const recent = await api.getRecent(scraperName);

    let publicationUpdates = await processItems(recent, async (publication) => {
        const { volumesAndIssues } = await navigateToVolumesAndIssues(page, publication);
        const existingVolume = publication.recent_volume;
        const existingIssue = publication.recent_issue;

        const newVolumes = existingVolume
            ? volumesAndIssues.filter(volume => parseInt(volume.number) >= parseInt(existingVolume.number))
            : volumesAndIssues;

        const volumeUpdates = await handleVolumeUpdates(page, publication, newVolumes, existingVolume, existingIssue);

        if (!volumeUpdates.length) return;

        return {
            id: publication.id,
            volumes: volumeUpdates
        };
    });

    fs.writeFileSync('publication-updates.json', JSON.stringify(publicationUpdates));
    // if (publicationUpdates.length) await api.updatePublications(publicationUpdates);
};

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

async function handleVolumeUpdates(page, publication, volumes, existingVolume, existingIssue) {
    return await processItems(volumes, async (volume) => {
        const volNumber = parseInt(volume.number);
        const existingVolNumber = parseInt(existingVolume?.number || 0);
        const existingIssueName = existingIssue?.name;

        let newIssues = [];

        if (volNumber === existingVolNumber) {
            newIssues = volume.issues.filter(issue => {
                if (!existingIssueName) return true;

                const issueNum = parseInt(issue.name);
                const existingIssueNum = parseInt(existingIssueName);

                if (!isNaN(issueNum) && !isNaN(existingIssueNum)) {
                    return issueNum >= existingIssueNum;
                }

                return issue.name > existingIssueName;
            });
        } else {
            newIssues = volume.issues;
        }

        const issueUpdates = await handleIssueUpdates(page, publication, volume, newIssues);

        if (newIssues.length) {
            return {
                name: volume.number,
                year_published: volume.year_published,
                issues: issueUpdates
            };
        }
    });
}

async function handleIssueUpdates(page, publication, volume, issues) {
    return await processItems(issues, async (issue) => {
        const url = `${publication.link}/volumes-and-issues/${volume.number}-${issue.name}`;
        if (!(await navigateToPage(page, url))) return null;
        await utils.handleCookieDialog(page);
        
        const articleUrls = await data.extractArticleUrls(page);
        const existingUrls = publication.recent_issue?.articles.map(article => article.link) || [];
        const newArticleUrls = articleUrls.filter(articleUrl => !existingUrls.includes(articleUrl));

        let articles = await processItems(newArticleUrls, async (articleUrl) => {
            if (!(await navigateToPage(page, articleUrl))) return null;
            await utils.handleCookieDialog(page);

            const article = await data.extractArticle(page, articleUrl);
            return article;
        });

        return {
            name: issue.name,
            month_published: issue.month_published,
            articles
        }
    });
}