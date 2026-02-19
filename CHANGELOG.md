# Changelog

All notable changes to this project will be documented in this file.

## [2026-02-19]
### Fixed
- **Connectivity Issue**: Resolved "Site can't be reached" error by clarifying HTTP usage (vs HTTPS) and updating server to bind to `0.0.0.0` for better local accessibility.
- **Poll Timer**: Fixed an issue where the next poll countdown would continue into negative numbers by ensuring an immediate reset when it reaches zero.

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
