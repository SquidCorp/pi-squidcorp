# Changelog

## [0.1.0] - 2026-03-25

- Overlay catalog at `.pi/just/justfile.json` with optional `scripts/`
- `/just:<name>` runs or hands off each recipe; descriptions appear in Pi autocomplete
- `/just` lists recipes
- `/just:validate` schema-checks, then starts an agent to set `blocking: true`
- `/just:merge` imports public recipes from the repo justfile and flags duplicates
