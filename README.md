# Sensibull P&L Auto-Exit
Fills the Sensibull gap by providing automated P&L threshold monitoring and auto-exit capabilities via the Kite API.

## Features
- **Real-time Monitoring**: Polls Sensibull/Kite positions every 30 seconds.
- **Visual Dashboard**: Grouped positions by underlying.
- **Smart Thresholds**: Set Profit % and Loss % targets per underlying.
- **One-Click Exit**: Automated market square-off of all legs when thresholds are hit.
- **Demo Mode**: Test the UI and logic with mock data without affecting your real portfolio.

## Architecture
1. **Poll**: `GET /api/positions` fetches data (Mock or Kite API).
2. **Check**: Frontend logic compares `total_pnl_pct` against user-defined thresholds in `localStorage`.
3. **Exit**: If triggered, `POST /api/exit` executes market orders on Kite for all legs of the underlying.

## Setup
1. **Sensibull Login**: Ensure you are logged into [web.sensibull.com](https://web.sensibull.com) in your browser (cookies persist for the login check).
2. **Kite Access**:
   - Get your `access_token` by visiting: `https://kite.zerodha.com/connect/login?api_key=4wlx0yhpb2qq4wz3`
   - Update the `.env` file with your `KITE_API_KEY` and `KITE_ACCESS_TOKEN`.
3. **Installation**:
   ```bash
   npm install
   ```
4. **Run**:
   ```bash
   npm run dev
   ```
5. **Access**: Open [http://localhost:3000](http://localhost:3000)

## Demo Mode
The app starts in **Demo Mode** by default. It uses `mock_data/mock_positions.json` to simulate a live portfolio. You can toggle "Demo Mode" off in the header to connect to your real Kite account.

## PM Notes
- **UX Flow**: Designed to mirror the Sensibull "Positions" page for familiarity.
- **Safety**: Added a confirmation modal before any real order execution to prevent accidental exits.
- **Efficiency**: Reduces the need for constant manual monitoring by ~90%.

---
*Disclaimer: Use at your own risk. This is a prototype and should be tested thoroughly in Demo Mode before live use.*
