async function extractPublications(page) {
    try {
        const results = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.journaltable tbody tr'));

            return rows.map(row => {
                const titleElement = row.querySelector('.journal-name-cell');
                const title = titleElement.innerText;

                const link = titleElement.querySelector('a')?.href;

                let matchedPublishers = title.match(/\b[A-Z]{2,}\b/g) || [];
                matchedPublishers = matchedPublishers.filter(word => word !== "AI"); 

                const publishers = Array.from(new Set(["MDPI", ...matchedPublishers])).map(name => ({
                    name,
                    scraper: "mdpi"
                }));

                const issn = row.querySelectorAll('td')[2].innerText;

                const yearElement = row.querySelectorAll('td')[3];
                const year_published = yearElement.innerText.trim();

                const type = "Journal";

                return { publishers, title, issn, link, year_published, type };
            }).filter(item => item !== null);
        });

        return results;
    } catch (error) {
        console.error("Error extracting MDPI results:", error);
        return [];
    }
}

async function extractDescription(page) {
    try {
        const description = await page.evaluate(() => {
            let contentElement = document.querySelector('.journal__description__content');

            let textContent = contentElement.innerHTML.trim();
            textContent = textContent.split('<ul>')[0];
            textContent = textContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            textContent = textContent.replace(/&nbsp;/g, '');

            return textContent;
        });

        return description;
    } catch (error) {
        console.log('Error fetching description:', error.message)
    }
}

async function extractVolumes(page) {
    try {
        const volumes = await page.evaluate(() => {
            const volumeElements = document.querySelectorAll('.journal-browser-volumes .side-menu-li');
            
            return Array.from(volumeElements).map(element => {
                const linkElement = element.querySelector('a');
                const title = linkElement.textContent.trim();
                
                const numberMatch = title.match(/Vol\.\s*(\d+)/);
                const number = numberMatch ? numberMatch[1] : null;
                
                const yearMatch = title.match(/\((\d{4})\)/);
                const year_published = yearMatch ? yearMatch[1] : null;

                return { number, year_published };
            });
        });

        const filteredVolumes = volumes.filter(volume => volume.year_published && Number(volume.year_published) >= 2010);
        const sortedVolumes = filteredVolumes.sort((a, b) => Number(a.number) - Number(b.number));

        return sortedVolumes;
    } catch (error) {
        console.error('Error fetching volumes:', error.message);
    }
}

async function extractIssues(page) {
    try {
        await page.waitForSelector('.middle-column__main .content__container', { timeout: 30000 });

        const issues = await page.evaluate(() => {
            const issueList = [];

            const ulIssues = document.querySelectorAll('.content__container .ul-spaced ul li');
            if (ulIssues.length > 0) {
                ulIssues.forEach(issue => {
                    const issueText = issue.querySelector('a').textContent.trim();
                    const match = issueText.match(/Issue (\d+)\s\((\w+)\s\d{4}\)/);

                    if (match) {
                        const name = match[1];
                        const month = match[2];
                        const monthNumber = new Date(Date.parse(month + " 1, 2020")).getMonth() + 1;
                        issueList.push({ name, month_published: monthNumber.toString() });
                    }
                });
            }

            const divIssues = document.querySelectorAll('.content__container .issue-cover');
            if (divIssues.length > 0) {
                divIssues.forEach(issue => {
                    const nameText = issue.querySelector('h4')?.textContent.match(/Iss\.\s(\d+)/);
                    const monthText = issue.querySelector('h5')?.textContent.trim();

                    if (nameText && monthText) {
                        const name = nameText[1];
                        const monthName = monthText.split(" ")[0];
                        const monthNumber = new Date(Date.parse(monthName + " 1, 2020")).getMonth() + 1;
                        issueList.push({ name, month_published: monthNumber.toString() });
                    }
                });
            }

            return issueList;
        });

        return issues;
    } catch (error) {
        console.error('Error fetching volume:', error.message);
        return null;
    }
}

async function extractArticleUrls(page, startId = 1) {
    const articleUrls = await page.evaluate((startId) => {
        const articleElements = document.querySelectorAll('.article-item .article-content');

        const urls = Array.from(articleElements)
            .map(articleElement => {
                const typeElement = articleElement.querySelector('.article-icons .label.articletype');
                const type = typeElement?.textContent.trim();

                if (type === 'Editorial') {
                    return null;
                }

                const titleElement = articleElement.querySelector('.title-link');
                const url = titleElement?.href;

                const articleNum = url ? parseInt(url.split('/').pop()) : null;

                if (articleNum !== null && articleNum >= startId) {
                    return { url, articleNum };
                }

                return null;
            })
            .filter(item => item !== null)
            .sort((a, b) => a.articleNum - b.articleNum)
            .map(item => item.url);

        return urls;
    }, startId);

    return articleUrls;
}

async function extractNewArticleUrls(page, id) {
    const articleUrls = await page.evaluate(() => {
        const articleElements = document.querySelectorAll('.article-item .article-content');

        return Array.from(articleElements)
            .map(articleElement => {
                const typeElement = document.querySelector('.article-icons .label.articletype');
                const type = typeElement?.textContent.trim();

                if (type === 'Editorial') {
                    return null;
                }

                const titleElement = articleElement.querySelector('.title-link');
                const url = titleElement?.href;

                const urlId = url ? parseInt(url.split('/').pop()) : null;

                if (urlId !== null && urlId >= id) {
                    return url;
                }

                return null;
            })
            .filter(url => url !== null);
    });

    return articleUrls;
}

async function extractArticle(page, url) {
    try {
        const notFound = await page.evaluate(() => {
            const errorHeading = document.querySelector('.content__container h1');
            return errorHeading && errorHeading.textContent.trim() === 'Error 404 - File not found';
        });

        if (notFound) {
            return { notFound: true, article: null };
        }

        const article = await page.evaluate((url) => {
            const typeElement = document.querySelector('.article-icons .label.articletype');
            const type = typeElement?.textContent.trim();

            if (type === 'Editorial') {
                return null;
            }

            const titleElement = document.querySelector('h1.title.hypothesis_container[itemprop="name"]');
            const abstractElement = document.querySelector('.html-abstract .html-p');
            const firstParagraphElement = document.querySelector('div.html-body > div.html-p:first-of-type');
            const dateElement = document.querySelector('.pubhistory span:last-of-type');
            const doiElement = document.querySelector('.bib-identity');
            const keywordsContainer = document.querySelector('.html-gwd-group');
            const authorsContainer = document.querySelectorAll('.art-authors .inlineblock');
            const affiliationContainer = document.querySelectorAll('.art-affiliations .affiliation');
            const pdfElement = document.querySelector('.UD_ArticlePDF');

            const title = titleElement ? titleElement.textContent.trim() : null;
            const description = abstractElement ? abstractElement.innerText.trim() : firstParagraphElement ? firstParagraphElement.innerText.trim() : null;

            const date = dateElement ? dateElement.textContent.trim().replace('Published: ', ''): null;
            const published_date = new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');

            const doi = doiElement ? doiElement.textContent.trim().match(/https:\/\/doi\.org\/[^\s]+/)[0] : null;
            const pdf_link = pdfElement ? pdfElement.href : null;

            const keywords = keywordsContainer 
                ? Array.from(keywordsContainer.querySelectorAll('a')).map(keywordLink => ({
                    name: keywordLink.textContent.trim()
                }))
                : null;

            
            const authors = Array.from(authorsContainer).map(author => {
                const name = author.querySelector('div.profile-card-drop')?.textContent.trim();
                const sup = author.querySelector('sup')?.textContent.trim().split(',')[0];

                const affiliations = Array.from(affiliationContainer).map(affiliation => {
                    const affiliationName = affiliation.querySelector('.affiliation-name')?.textContent.trim();
                    const affiliationItem = affiliation.querySelector('.affiliation-item')?.textContent.trim() || 'N/A';
                    
                    return {
                        affiliationName,
                        affiliationItem
                    };
                });

                let university = null;
                if (sup && !isNaN(sup)) {
                    const affiliationForSup = affiliations.find(aff => aff.affiliationItem === sup);
                    if (affiliationForSup) {
                        university = affiliationForSup.affiliationName;
                    }
                }

                if (!university && affiliations.length > 0) {
                    university = affiliations[0].affiliationName;
                }
                
                const orcid_link = author.querySelector('a[href*="orcid.org"]')?.href;
                const profile_link = author.querySelector('a[href*="sciprofiles.com"]')?.href || author.querySelector('a')?.href;

                return { name, university, profile_link, orcid_link };
            });
            
            return { title, description, published_date, link: url, doi, pdf_link, authors, keywords };
        }, url);

        if (!article) {
            return { notFound: false, article: null };
        }

        return { notFound: false, article };
    } catch (error) {
        console.error(`Error navigating to ${url}:`, error.message);
        return { notFound: true, title: null };
    }
}

export default {
    extractPublications,
    extractDescription,
    extractVolumes,
    extractIssues,
    extractArticleUrls,
    extractNewArticleUrls,
    extractArticle
}