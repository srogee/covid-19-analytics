const express = require('express');
const request = require('request-promise-native');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const apiUrls = [ // Allowed urls from covidtracking JSON API
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

// Set up ability to get data from covidtracking, without actually requesting it every time
apiUrls.forEach((url) => {
    app.get(url, async (req, res) => {
        var cacheEntry = cachedStats.get(url);
        try {
            if (!cacheEntry || Date.now() - cacheEntry.lastCacheTime > cacheExpiration) {
                console.log(`Requesting ${url}...`);
                cacheEntry = {
                    lastCacheTime: Date.now(),
                    data: await request(`https://covidtracking.com${url}`, { 
                        json: true
                    })
                };
                cachedStats.set(url, cacheEntry);
            }
        } catch (e) {
            console.error(e);
        }

        res.json(cacheEntry ? cacheEntry.data : null);
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});