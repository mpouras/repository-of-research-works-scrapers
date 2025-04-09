import { mdpiJournalsList } from './mdpi/mdpi-journals.js';
import { mdpiPublicationsVolumes } from './mdpi/mdpi-publications-volumes.js';
import { mdpiIssues } from './mdpi/mdpi-issues.js';
import { mdpiArticles } from './mdpi/mdpi-articles.js';

import { acmJournalsList } from './acm/acm-journals.js';
import { acmPublications } from './acm/acm-publications.js';
import { acmVolumesIssues } from './acm/acm-volumes-issues.js';
import { acmArticlesList } from './acm/acm-articles-list.js';

import { springerJournalsList } from './springer-link/springer-link-journals.js';
import { springerArticlesList } from './springer-link/springer-link-articles-list.js';
import { springerPublicationsVolumesIssues } from './springer-link/springer-link-volumes-issues.js';

import { mdpiUpdate } from './mdpi/mdpi-update.js';
import { springerUpdate } from './springer-link/springer-link-update.js';


export default {
    mdpi_journals_list: mdpiJournalsList,
    mdpi_publications_volumes: mdpiPublicationsVolumes,
    mdpi_issues: mdpiIssues,
    mdpi_articles: mdpiArticles,

    mdpi_update: mdpiUpdate,

    acm_journals_list: acmJournalsList,
    acm_publications: acmPublications,
    acm_volumes_issues: acmVolumesIssues,
    acm_articles_list: acmArticlesList,

    springer_journals_list: springerJournalsList,
    springer_publications_volumes_issues: springerPublicationsVolumesIssues,
    springer_articles_list: springerArticlesList,

    springer_update: springerUpdate,
};
