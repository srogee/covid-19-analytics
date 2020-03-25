const express = require('express');
const request = require('request-promise-native');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const apiUrl = 'https://covidtracking.com/api/us/daily';
const cacheExpiration = 1000 * 60 * 10; // Every 10 minutes
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

app.get('/', async (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/cachedStats', async (req, res) => {
    res.json(await getStats());
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

let stats = null;
let lastCacheTime = null;

async function getStats() {
    if (lastCacheTime == null || Date.now() - lastCacheTime > cacheExpiration) {
        console.log('Re-caching stats...');
        stats = await request(apiUrl, { 
            json: true
        });
        lastCacheTime = Date.now();
    }

    return stats;
}