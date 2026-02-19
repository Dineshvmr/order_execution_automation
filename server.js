require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cheerio = require('cheerio');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/check-login', async (req, res) => {
    console.log('Checking login status...');
    try {
        const sensibullUrl = process.env.SENSIBULL_URL || 'https://web.sensibull.com';
        const response = await fetch(`${sensibullUrl}/positions`, {
            credentials: 'include',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('Sensibull response status:', response.status);

        if (response.status === 401) {
            return res.json({ loggedIn: false, message: 'Login to web.sensibull.com first' });
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Basic check for positions content in the parsed HTML
        // This is a prototype check, adjust based on actual page structure if needed
        const hasPositionsContent = html.toLowerCase().includes('positions') || $('title').text().toLowerCase().includes('positions');

        if (response.ok && hasPositionsContent) {
            console.log('Login successful');
            res.json({ loggedIn: true });
        } else {
            console.log('Login failed or unexpected content');
            res.json({ loggedIn: false, message: 'Login to web.sensibull.com first' });
        }
    } catch (error) {
        console.error('Error during login check:', error);
        res.status(500).json({ loggedIn: false, message: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
