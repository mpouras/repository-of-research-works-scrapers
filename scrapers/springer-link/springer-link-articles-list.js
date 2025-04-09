import api from "../../api.js";
import '../../config.js';
import utils from './utils.js';


export const springerArticlesList = async (page) => {
    console.log("Fetching articles for Springer...");
    const scraperName = 'springer';

    let publications = await api.getPublications(scraperName);

    if (!publications || publications.length === 0) {
        console.log('No publications found or an error occurred.');
        return;
    }

    for (const publication of publications.slice(0,1)) {
        const publicationId = publication.id;
        const publicationLink = publication.link;

        const volumes = await api.getVolumes(publicationId);

        for (const volume of volumes.slice(0,1)) {
            const volumeNumber = volume.number;

            const issues = await api.getIssues(publicationId, volumeNumber);

            for (const issue of issues.slice(0,1)) {
                const issueName = issue.name;
                const url = `${publicationLink}/volumes-and-issues/${volumeNumber}-${issueName}`;
                console.log(`Navigating to: ${url}`);

                let articles = await navigateArticlesList(page, url);

                // console.log(articles);
                await api.storeArticles(articles, publicationId, volumeNumber, issueName);

                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
};

async function navigateArticlesList(page, url) {
    try {
        await page.goto(url, { timeout: 60000 });

        await utils.handleCookieDialog(page);

        await page.waitForSelector('.u-list-reset .app-card-open', { timeout: 30000 });
        const articleUrls = await extractArticleUrls(page);

        const articles = [];
        for (const articleUrl of articleUrls.slice(0,1)) {
            const article = await extractArticle(page, articleUrl);
            articles.push(article);

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return articles.filter(article => article !== null);
    } catch (error) {
        console.error('Error navigating to articles list:', error.message);
    }
}

async function extractArticleUrls(page) {
    const articleUrls = await page.evaluate(() => {
        const citationType = ['article', 'research-article', 'opinion paper'];

        const articleElements = document.querySelectorAll('.u-list-reset .app-card-open');

        return Array.from(articleElements)
            .map(articleElement => {
                const citationElement = articleElement.querySelector('.app-card-open__meta .c-meta__type');
                const citation = citationElement?.innerText.trim().toLowerCase();

                if (!citationType.some(type => citation.includes(type))) {
                    return null;
                }

                const titleElement = articleElement.querySelector('.app-card-open__heading a');
                const url = titleElement?.href;
                return url;
            })
            .filter(url => url !== null);
    });

    return articleUrls;
}

async function extractArticle(page, url) {
    try {
        console.log(`Navigating to article: ${url}`);
        await page.goto(url, { timeout: 60000 });

        await utils.handleCookieDialog(page);

        const scraperLink = process.env.BASE_URL_SPRINGER;

        const article = await page.evaluate(async (data) => {
            const { url, scraperLink } = data;

            const titleElement = document.querySelector('.c-article-title');
            const descriptionElement = document.querySelector('.c-article-section__content p');
            const dateElement = document.querySelector('.c-article-identifiers__item time');
            const doiElement = document.querySelector('li.c-bibliographic-information__list-item--full-width .c-bibliographic-information__value');
            const pdfElement = document.querySelector('.c-pdf-container a');

            const title = titleElement.innerText.trim();
            const description = descriptionElement.innerText.trim();

            const date = dateElement.innerText.trim();
            const published_date = new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');

            const doi = doiElement.innerText.trim();
            const pdf_link = pdfElement ? pdfElement.href : null;
            
            const authorElements = document.querySelectorAll('.c-article-author-list__item');
            const authors = Array.from(authorElements).map(author => {
                const name = author.querySelector('a[data-test="author-name"]').innerText.trim();
                const university = document.querySelector('.c-article-author-affiliation__address').innerText.trim();
                const profile_link = `${scraperLink}/search?dc.creator=${encodeURIComponent(name)}`;
                const orcid_link = author.querySelector('.js-orcid')?.href;

                return { name, university, profile_link, orcid_link };
            });

            const keywordElements = document.querySelectorAll('.c-article-subject-list__subject a');
            const keywords = Array.from(keywordElements).map(keywordElement => {
                const name = keywordElement.innerText.trim().toLowerCase();
                return { name };
            });

            return { title, description, published_date, link: url, doi, pdf_link, authors, keywords };
        }, { url, scraperLink });

        return article;
    } catch (error) {
        console.error('Error navigating to articles list:', error.message);
        return [];
    }
}