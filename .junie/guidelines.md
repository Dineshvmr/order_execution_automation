# Project Rules

## Input Handling
- All inputs provided by the user (API keys, tokens, thresholds, settings) must be treated as sensitive or project-specific configurations.
- API keys and tokens should never be hardcoded and must be managed via `.env` files.
- User-provided logic requirements (like the removal of the P&L trend chart) must be strictly adhered to in future iterations.
- Local storage should be used for frontend persistence of non-sensitive user inputs (like P&L thresholds).

## Development Standards
- Maintain consistency with the existing Node.js/Express and vanilla JS frontend architecture.
- Follow the established naming conventions for files and variables.
- Ensure all changes are documented in the `CHANGELOG.md`.
- Always verify changes in "Demo Mode" before suggesting live execution.
