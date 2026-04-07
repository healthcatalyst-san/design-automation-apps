/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const staticPath = path.join(__dirname,'dist');
const publicPath = path.join(__dirname,'public');

// Limit body size to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.set('trust proxy', 1 /* number of proxies between user and server */)

// Load Vertex AI Gemini Route Handlers
require('./geminiRoutes')(app);

// Serve index.html or placeholder fallback
app.get('/', (req, res) => {
    const placeholderPath = path.join(publicPath, 'placeholder.html');
    const indexPath = path.join(staticPath, 'index.html');

    res.sendFile(indexPath, (err) => {
        if (err) {
            console.log('LOG: index.html not found or unreadable. Falling back to original placeholder.');
            res.sendFile(placeholderPath, (err2) => {
                if (err2) {
                     res.status(404).send("Not build yet. Please run npm run build to populate /dist.");
                }
            });
        }
    });
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

// Start the HTTP server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
