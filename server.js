const express = require('express');
const request = require('request-promise-native');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const apiUrls = [
    '/api/us/daily',
    '/api/us',
];
const cacheExpiration = 1000 * 60; // Every 1 minutes
const publicDir = path.join(__dirname, 'public');

let cachedStats = new Map();

app.use(express.static(publicDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

apiUrls.forEach((url) => {
    app.get(url, async (req, res) => {
        if (!cachedStats.has(url) || Date.now() - cachedStats.get(url).lastCacheTime > cacheExpiration) {
            console.log(`Requesting ${url}...`);
            cachedStats.set(url, {
                lastCacheTime: Date.now(),
                data: await request(`https://covidtracking.com${url}`, { 
                    json: true
                })
            });
        }

        res.json(cachedStats.get(url).data);
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});