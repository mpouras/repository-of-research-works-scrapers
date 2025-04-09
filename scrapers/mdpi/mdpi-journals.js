import api from "../../api.js";
import { navigateToPage } from "../utils.js";
import data from "./data.js"

export const mdpiJournalsList = async (page) => {
    const url = `${process.env.BASE_URL_MDPI}/subject/computer-math`;
    if (!(await navigateToPage(page, url))) return {};

    const publications = await data.extractPublications(page);
    
    await api.storePublications(publications);
};