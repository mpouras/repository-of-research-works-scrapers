import fetch from 'node-fetch';
import './config.js';

async function getPublications(scraperName) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/scraper/publications/${scraperName}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Error getPublications status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching entry:', error.message);
    }
}

async function getVolumes(publicationId) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/publications/${publicationId}/volumes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn(`Skipping publication with id: ${publicationId}: no volumes found (status ${response.status})`);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching entry:', error.message);
        return [];
    }
}

async function getIssues(publicationId, volumeNumber) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/publications/${publicationId}/${volumeNumber}/issues`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error getVolumeIssues status: ${response.status}`);
        }

        const responseData = await response.json();

        return await responseData.data;
    } catch (error) {
        console.error('Error fetching entry:', error.message);
    }
}

async function getRecent(scraperName) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/scraper/recent/${scraperName}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Error getPublications status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching entry:', error.message);
    }
}

async function storePublications(entries) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/scraper/publications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            },
            body: JSON.stringify(entries),
        });

    
        const responseData = await response.json();
        console.log(responseData);
    } catch (error) {
        console.error('Error posting entry:', error.message);
    }
}

async function updatePublications(entries) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/scraper/publications`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            },
            body: JSON.stringify(entries)
        });

        const responseData = await response.json();
        console.log(responseData);
    } catch (error) {
        console.error('Error fetching entry:', error.message);
    }
}

async function storeArticles(articles, publicationId, volumeNumber, issueName) {
    try {
        const response = await fetch(`${process.env.API_URL}/api/scraper/publications/${publicationId}/${volumeNumber}/${issueName}/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            },
            body: JSON.stringify(articles),
        });

        const responseData = await response.json();
        console.log(responseData);
    } catch (error) {
        console.error('Error fetching entry:', error.message);
    }
}


export default {
    getPublications,
    getVolumes,
    getIssues,
    getRecent,
    storePublications,
    updatePublications,
    storeArticles
};