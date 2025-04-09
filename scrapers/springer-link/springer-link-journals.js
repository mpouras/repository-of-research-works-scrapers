import api from "../../api.js";
import { processItems, navigateToPage } from "../utils.js";
import data from "./data.js";
import utils from './utils.js';

export const springerJournalsList = async (page) => {
    const url = `${process.env.BASE_URL_SPRINGER}/journals/browse-subject?subject=COMPUTER_SCIENCE&sortBy=&page=`;
    if (!(await navigateToPage(page, url + 1))) return {};
    await utils.handleCookieDialog(page);

    const totalPages = await utils.calculateTotalPages(page);
    const publicationsList = await scrapeAllPages(page, url, totalPages);

    await api.storePublications(publicationsList);
};

async function scrapeAllPages(page, url, totalPages) {
    const allowedDomains = ["link.springer.com", "www.springer.com", "springeropen.com"];

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    const publicationsList = await processItems(pages, async (currentPage) => {
        if (currentPage > 1) {
            if (!(await navigateToPage(page, url + currentPage))) return null;
        }

        const extractedPublications = await data.extractPublications(page);

        return extractedPublications.filter(pub =>
            allowedDomains.some(domain => pub.link.includes(domain))
        );
    }, 2000);

    return publicationsList.flat().filter(Boolean);
}