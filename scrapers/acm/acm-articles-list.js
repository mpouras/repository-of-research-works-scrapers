import api from "../../api.js";
import '../../config.js';
import utils from "./utils.js";


export const acmArticlesList = async (page) => {
    console.log("Fetching articles list for ACM...");
    const scraperName = 'acm';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }
    
    for (const publication of publications.slice(0,1)) {
        if (publication.year_published === null) {
            console.log(`Publication '${publication.title}' is empty or not published yet.`);
            continue;
        }

        const publicationId = publication.id;
        const shortenedName = utils.getLastPathSegment(publication.link);

        const volumes = await api.getVolumes(publicationId);

        for (const volume of volumes.slice(0,1)) {
            const yearPublished = volume.year_published;
            const volumeNumber = volume.number;

            const issues = await api.getIssues(publicationId, volumeNumber);

            for (const issue of issues.slice(0,1)) {
                const issueName = issue.name;
                let url = `${process.env.BASE_URL_ACM}/toc/${shortenedName}/${yearPublished}/${volumeNumber}/${issueName}`;
                console.log(`Navigating to: ${url}`);

                // Special case for TASLP publication. The URL format is different for issues published in 2020 and later.
                if (shortenedName === 'taslp' && yearPublished >= 2020) {
                    url = `${process.env.BASE_URL_ACM}/toc/10.5555/${shortenedName}.${yearPublished}.issue-${volumeNumber}`;
                }

                let articles = await navigateArticlesList(page, url);

                // console.log(articles);
                await api.storeArticles(articles, publicationId, volumeNumber, issueName);
            }
        }
    }
};

async function showMoreArticlesInList(page) {
    const showAllButton = await page.$('.showAllProceedings', { timeout: 30000 } );
    if (!showAllButton) {
        console.log('No "Show All" button found.');
        return;
    }

    const batchSize = 30;
    let listCount = batchSize;
    const showAllButtonText = await page.evaluate(el => el.innerText.trim(), showAllButton);
    const match = showAllButtonText.match(/\(\+(\d+)\)/);
    listCount += parseInt(match[1], 10);

    const numLoops = Math.ceil(listCount / batchSize);
    for (let i = 1; i < numLoops; i++) {
        const start = i * batchSize + 1;
        const end = Math.min((i + 1) * batchSize, listCount);

        console.log(`Processing batch ${i + 1}: Entries ${start} to ${end}`);

        const showMoreButton = await page.$('.showMoreProceedings', { timeout: 15000 });
        if (!showMoreButton) {
            console.log(`"See More" button not found for batch ${i + 1}. Exiting loop.`);
            break;
        }

        await showMoreButton.click();
        console.log(`Clicked "See More" button for batch ${i + 1}`);

        try {
            await page.waitForSelector('.proceedingsLazyLoad .table-of-content-wrapper .issue-item-container', {
                visible: true,
            });
            console.log(`Batch ${i + 1} content loaded.`);
        } catch (error) {
            console.error(`Error waiting for content to load for batch ${i + 1}: ${error}`);
            break;
        }
    }

    console.log('All batches processed successfully.');
    return listCount;
}

async function showAllKeywords(page) {
    const showAllButton = await page.$('.count-list .removed-items-count');
    if (showAllButton) {
        await page.waitForSelector('.count-list .removed-items-count', { visible: true, timeout: 10000 });

        await showAllButton.click();

        await page.waitForTimeout(2000);
    } else {
        console.log('No "Show More" button found.');
    }
}

async function extractKeywords(page) {
    const keywords = await page.evaluate(() => {
        const keywordElements = document.querySelectorAll('.tags-widget__content ul li a');
        return Array.from(keywordElements).map(keyword => keyword.innerText.trim().toLowerCase());
    });

    return keywords;
}

async function extractArticleUrls(page) {
    const articleUrls = await page.evaluate(() => {
        const citationType = ['article', 'research-article', 'survey'];

        const articleElements = document.querySelectorAll('.issue-item-container');

        return Array.from(articleElements)
            .map(articleElement => {
                const citationElement = articleElement.querySelector('.issue-item__citation .issue-heading');
                const citation = citationElement?.innerText.trim().toLowerCase();

                if (!citationType.some(keyword => citation.includes(keyword))) {
                    return null;
                }

                const titleElement = articleElement.querySelector('.issue-item__title a');
                const url = titleElement?.href;
                return url;
            })
            .filter(url => url !== null);
    });

    return articleUrls;
}

async function navigateArticlesList(page, url) {
    try {
        await page.goto(url, { timeout: 60000 });

        await utils.handleCookieDialog(page);
        await showMoreArticlesInList(page);

        await showAllKeywords(page);
        const keywords = await extractKeywords(page);

        await page.waitForSelector('.issue-item-container', { timeout: 30000 });
        const articleUrls = await extractArticleUrls(page);

        const articles = [];
        for (const articleUrl of articleUrls.slice(0,1)) {
            const article = await extractArticle(page, articleUrl);
            article.keywords = keywords;
            articles.push(article);
        }

        return articles.filter(article => article !== null);
    } catch (error) {
        console.error('Error navigating to articles list:', error.message);
        return [];
    }
}

async function extractArticle(page, url) {
    try {
        console.log(`Navigating to article: ${url}`);
        await page.goto(url, { timeout: 60000 });

        await utils.handleCookieDialog(page);

        const article = await page.evaluate(async (url) => {
            const titleElement = document.querySelector('h1[property="name"]');
            const descriptionElement = document.querySelector('[property="abstract"] div[role="paragraph"]');
            const dateElement = document.querySelector('.core-published .core-date-published');
            const doiElement = document.querySelector('.doi a');
            const pdfElement = document.querySelector('.btn.btn--pdf.red[title="View PDF"]');

            const title = titleElement.innerText.trim();
            const description = descriptionElement.innerText.trim();

            const date = dateElement.innerText.trim();
            const published_date = new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');

            const doi = doiElement.href;
            const pdf_link = pdfElement ? pdfElement.href : null;

            const authorElements = document.querySelectorAll('[property="author"] .dropBlock__body');
            const authors = Array.from(authorElements).map(author => {
                const name = author.querySelector('[property="name"]').innerText.trim();
                const university = author.querySelector('.affiliations [property="name"]').innerText.trim();
                const profile_link = author.querySelector('.core-author-link a').href;
                const orcid_link = author.querySelector('.core-orcid-link a')?.href || null;

                return { name, university, profile_link, orcid_link };
            });

            return { title, description, published_date, link: url, doi, pdf_link, authors };
        }, url);

        return article;
    } catch (error) {
        console.error('Error navigating to articles list:', error.message);
        return [];
    }
}