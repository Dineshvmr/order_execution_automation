# Changelog

All notable changes to this project will be documented in this file.

## [2026-02-19]
### Improved
- **Sensibull Login Check**: Updated `/check-login` to handle redirects and better detect login status, providing more descriptive error messages.
- **Kite Live Mode**: Enhanced error handling in `/api/positions` for Live mode, including better JSON parsing and clearer instructions on token expiry/invalidity.
- **Frontend Feedback**: Added detailed error alerts and improved Kite redirect confirmation for a better prototyping experience.

### Added
- Created `.junie/guidelines.md` to define project rules for input handling and development standards.
- Created `CHANGELOG.md` to track project evolution.

### Changed
- Updated `README.md` to remove mentions of P&L trend charts.

## [Previous Changes]
### Added
- Implementation of `POST /api/exit` using real Kite API integration.
- Exit confirmation modal in the frontend dashboard.
- Demo Mode toggle and visual status badges.
- Auto-Exit threshold monitoring with `localStorage` persistence.
- `/api/positions` endpoint to serve mock data or real Kite positions.
- `/check-login` endpoint for Sensibull session verification.
- Basic Node.js/Express server structure and initial frontend dashboard.

### Removed
- P&L trend chart and Chart.js dependency from `public/index.html`.
