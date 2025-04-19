async function extractPublications(page) {
    try {
        const results = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.app-card-open'));

            return rows.map(row => {
                const titleElement = row.querySelector('.app-card-open__heading');
                const descriptionElement = row.querySelector('.app-card-open__description p');

                const title = titleElement.innerText;
                const link = titleElement.querySelector('a')?.href;
                const description = descriptionElement ? descriptionElement.textContent.replace(/\s+/g, ' ').trim() : null;
                const publishers = [
                    {
                        name: "Springer Nature",
                        scraper: "springer"
                    }
                ];
                const type = "Journal";

                return { publishers, title, description, link, type };
            }).filter(item => item !== null);
        });

        return results;
    } catch (error) {
        console.error("Error extracting MDPI results:", error);
        return [];
    }
}

async function extractIssn(page) {
    try {
        const issn = await page.evaluate(() => {
            const issnElement = document.querySelector('.c-list-description__item[data-test="springer-print-issn"] dd.c-list-description__details');
            return issnElement ? issnElement.innerText.trim() : null;
        });

        return issn;
    } catch (error) {
        console.error('Error getting ISSN:', error.message);
    }
}

async function extractYearPublished(page) {
    try {
        const year_published = await page.evaluate(() => {
            const year_published = document.querySelector('[data-test="volumes-and-issues"] li:last-child h2 time')?.innerText.split(' ').pop();
            return year_published;
        });

        return year_published;
    } catch (error) {
        console.error('Error getting year published:', error.message);
    }
}

async function extractVolumesIssues(page) {
    try {
        const volumesAndIssues = await page.evaluate(() => {
            const volumeElements = document.querySelectorAll('[data-test="volumes-and-issues"] li');

            return Array.from(volumeElements).map(volumeElement => {
                let number = volumeElement.querySelector('h2 span:first-child')?.innerText.replace('Volume ', '').trim();
                const year_published = volumeElement.querySelector('h2 time')?.innerText.split(' ').pop();

                const issues = Array.from(volumeElement.querySelectorAll('.c-list-group__item')).map(issueElement => {
                    const name = issueElement.querySelector('a')?.innerText.replace('Issue ', '').trim();
                    const month = issueElement.querySelector('time')?.innerText.trim();
                    const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;
                    const month_published = monthNumber.toString();

                    return name && month_published ? { name, month_published } : null;
                }).filter(issue => issue !== null);

                if (!number || !year_published || issues.length === 0) {
                    return null; 
                }

                issues.sort((a, b) => a.name - b.name);
                return { number, year_published, issues };

            }).filter(volume => volume !== null).filter(volume => volume.year_published >= 2010);
        });

        volumesAndIssues.sort((a, b) => a.number - b.number);

        return volumesAndIssues;
    } catch (error) {
        console.error('Error fetching volume:', error.message);
        return null;
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

                if (citation === 'Editorial') {
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
        const scraperLink = process.env.BASE_URL_SPRINGER;

        const article = await page.evaluate(async (data) => {
            const { url, scraperLink } = data;

            const titleElement = document.querySelector('.c-article-title');
            const descriptionElement = document.querySelector('.c-article-section__content p');
            const dateElement = document.querySelector('.c-article-identifiers__item time');
            const doiElement = document.querySelector('li.c-bibliographic-information__list-item--full-width .c-bibliographic-information__value');
            const pdfElement = document.querySelector('.c-pdf-container a');

            const title = titleElement.innerText.trim();
            const description = descriptionElement.innerText.trim() || null;

            const date = dateElement.innerText.trim() || null;
            const published_date = new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');

            const doi = doiElement.innerText.trim();
            const pdf_link = pdfElement ? pdfElement.href : null;
            
            const authorElements = document.querySelectorAll('.c-article-author-list__item');
            const authors = Array.from(authorElements).map(author => {
                const name = author.querySelector('a[data-test="author-name"]').innerText.trim();
                const university = document.querySelector('.c-article-author-affiliation__address')?.innerText.trim();
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
        return null;
    }
}

export default {
    extractPublications,
    extractIssn,
    extractYearPublished,
    extractVolumesIssues,
    extractArticleUrls,
    extractArticle,
}