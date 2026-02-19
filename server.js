require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/api/positions', async (req, res) => {
    try {
        // As per requirement, use mock data even when connected
        const mockFilePath = path.join(__dirname, 'mock_data', 'mock_positions.json');
        const fileData = await fs.readFile(mockFilePath, 'utf8');
        const mockData = JSON.parse(fileData);

        if (!mockData.success || !mockData.payload || !mockData.payload.data) {
            return res.status(500).json({ error: 'Invalid mock data format' });
        }

        const underlyings = mockData.payload.data.map(u => {
            const legs = u.trades.map(t => ({
                name: t.trading_symbol,
                qty: t.quantity,
                pnl: t.unbooked_pnl + t.booked_profit_loss,
                delta: t.instrument_info ? (u.total_greeks ? u.total_greeks.delta / (u.trades.length || 1) : 0) : 0 // Simplified delta
            }));

            // If we have total_greeks.delta, we'll just show it at underlying level
            const total_pnl = u.total_profit;
            
            // Mocking a total_pnl_pct as it's not directly in the mock data in a simple way
            // Sensibull calculates it based on margin. For now, let's use a dummy or skip it if not found.
            // But the requirement says Return: {underlyings: [{name:"NIFTY", total_pnl:1710, total_pnl_pct:5.79, legs:[...] }, ...] }
            const total_pnl_pct = (Math.random() * 5).toFixed(2); // Random pct for prototype

            return {
                name: u.trading_symbol,
                total_pnl: total_pnl,
                total_pnl_pct: parseFloat(total_pnl_pct),
                legs: legs
            };
        });

        res.json({ underlyings });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: 'Failed to fetch positions' });
    }
});

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

app.post('/api/exit', (req, res) => {
    const { underlying } = req.query;
    console.log(`EXIT TRIGGERED for ${underlying}`);
    res.json({ success: true, message: `Exit triggered for ${underlying}` });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
