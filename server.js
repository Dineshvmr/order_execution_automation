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

let demoMode = true; // Default to demo mode for prototype

app.get('/api/positions', async (req, res) => {
    try {
        if (demoMode) {
            console.log('[DEMO MODE] Serving mock positions');
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
                    delta: t.instrument_info ? (u.total_greeks ? u.total_greeks.delta / (u.trades.length || 1) : 0) : 0
                }));
                const total_pnl = u.total_profit;
                const total_pnl_pct = (Math.random() * 5).toFixed(2);
                return {
                    name: u.trading_symbol,
                    total_pnl: total_pnl,
                    total_pnl_pct: parseFloat(total_pnl_pct),
                    legs: legs
                };
            });
            return res.json({ underlyings, mode: 'demo' });
        }

        // Real Kite Integration
        console.log('[LIVE MODE] Fetching real positions from Kite');
        const positionsRes = await fetch('https://api.kite.trade/portfolio/positions', {
            headers: {
                'X-Kite-Version': '3',
                'Authorization': `token ${process.env.KITE_API_KEY}:${process.env.KITE_ACCESS_TOKEN}`
            }
        });

        if (positionsRes.status === 403 || positionsRes.status === 401) {
            return res.status(401).json({ error: 'Kite token expired', redirect: `https://kite.zerodha.com/connect/login?api_key=${process.env.KITE_API_KEY}` });
        }

        const data = await positionsRes.json();
        if (data.status !== 'success') {
            throw new Error(data.message || 'Failed to fetch positions from Kite');
        }

        // Process real positions into the same format
        const grouped = {};
        data.data.net.forEach(pos => {
            // Very simple grouping by first 5 chars if it's an option/future, else full symbol
            // In a real app, we'd use a better logic or instrument metadata
            const underlying = pos.tradingsymbol.match(/^[A-Z]+/)[0];
            if (!grouped[underlying]) grouped[underlying] = { name: underlying, total_pnl: 0, legs: [] };
            
            grouped[underlying].total_pnl += pos.pnl;
            grouped[underlying].legs.push({
                name: pos.tradingsymbol,
                qty: pos.quantity,
                pnl: pos.pnl,
                delta: 0 // Kite API doesn't give greeks in net positions directly
            });
        });

        const underlyings = Object.values(grouped).map(u => ({
            ...u,
            total_pnl_pct: 0 // Need margin data for real pct, using 0 for now
        }));

        res.json({ underlyings, mode: 'live' });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/toggle-demo', (req, res) => {
    demoMode = req.body.demo !== undefined ? req.body.demo : !demoMode;
    console.log(`[SYSTEM] Demo mode toggled to: ${demoMode}`);
    res.json({ demo: demoMode });
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

app.post('/api/exit', async (req, res) => {
    const underlying = req.query.underlying || req.body.underlying;
    console.log(`EXIT TRIGGERED for ${underlying}`);

    if (!underlying) {
        return res.status(400).json({ error: 'Underlying is required' });
    }

    try {
        const apiKey = process.env.KITE_API_KEY;
        const accessToken = process.env.KITE_ACCESS_TOKEN;

        if (!apiKey || !accessToken) {
            console.error('Kite API Key or Access Token missing in .env');
            return res.status(500).json({ error: 'Kite credentials missing' });
        }

        const headers = {
            'X-Kite-Version': '3',
            'Authorization': `token ${apiKey}:${accessToken}`
        };

        // 1. Get positions from Kite
        console.log('Fetching positions from Kite...');
        const posResponse = await fetch('https://api.kite.trade/portfolio/positions', { headers });
        const posData = await posResponse.json();

        if (posData.status !== 'success') {
            console.error('Failed to fetch positions from Kite:', posData);
            return res.status(500).json({ error: 'Failed to fetch positions from Kite', detail: posData });
        }

        // 2. Filter positions for the given underlying
        // Kite positions are in data.net or data.day. Usually we check both or just net for square-off.
        const allPositions = [...(posData.data.net || []), ...(posData.data.day || [])];
        
        // Filter unique by tradingsymbol to avoid double counting if it's in both net and day
        const uniquePositions = [];
        const seenSymbols = new Set();
        for (const pos of allPositions) {
            if (!seenSymbols.has(pos.tradingsymbol)) {
                uniquePositions.push(pos);
                seenSymbols.add(pos.tradingsymbol);
            }
        }

        const matchingPositions = uniquePositions.filter(pos => 
            pos.tradingsymbol.startsWith(underlying) && pos.quantity !== 0
        );

        console.log(`Found ${matchingPositions.length} active legs for ${underlying}`);

        const orderIds = [];

        // 3. Place square-off orders
        for (const pos of matchingPositions) {
            const transactionType = pos.quantity > 0 ? 'SELL' : 'BUY';
            const quantity = Math.abs(pos.quantity);

            console.log(`Placing square-off order for ${pos.tradingsymbol}: ${transactionType} ${quantity}`);

            const orderParams = new URLSearchParams({
                tradingsymbol: pos.tradingsymbol,
                exchange: pos.exchange,
                transaction_type: transactionType,
                order_type: 'MARKET',
                quantity: quantity.toString(),
                product: pos.product, // Usually MIS or NRML
                validity: 'DAY'
            });

            const orderResponse = await fetch('https://api.kite.trade/orders/regular', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: orderParams
            });

            const orderResult = await orderResponse.json();
            if (orderResult.status === 'success') {
                console.log(`Order placed successfully for ${pos.tradingsymbol}: ${orderResult.data.order_id}`);
                orderIds.push(orderResult.data.order_id);
            } else {
                console.error(`Failed to place order for ${pos.tradingsymbol}:`, orderResult);
            }
        }

        res.json({ 
            success: true, 
            message: `Exit executed for ${underlying}. Orders placed: ${orderIds.length}`,
            exited: orderIds 
        });

    } catch (error) {
        console.error('Error during exit execution:', error);
        res.status(500).json({ error: 'Internal Server Error during exit' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
