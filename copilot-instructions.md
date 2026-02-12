# Project Context & Instructions

## Overview
Map-based application for exploring California's protected lands. Interactive MapLibre GL JS map with an LLM-powered chatbot for natural language data queries and map control.

## Key Technologies
- **Frontend**: MapLibre GL JS, PMTiles (vectors), COG + TiTiler (rasters), ES modules
- **Data**: STAC catalog → unified dataset records with visual + parquet assets
- **Analytics**: SQL queries via MCP (Model Context Protocol) to DuckDB on H3-indexed parquet
- **LLM**: OpenAI-compatible Chat Completions API (multiple models via proxy)
- **Deployment**: Kubernetes (nginx + git-clone init container)

## Architecture (app/ modules)
- `main.js` — Bootstrap: loads config, initializes catalog → map → tools → agent → UI
- `dataset-catalog.js` — Fetches STAC collections, builds unified records
- `map-manager.js` — Creates MapLibre map, manages layers/filters/styles
- `map-tools.js` — 9 local tools the LLM agent can call
- `tool-registry.js` — Unified dispatch for local + remote (MCP) tools
- `mcp-client.js` — MCP transport wrapper (connect once, lazy reconnect)
- `agent.js` — LLM orchestration loop (agentic tool-use cycle)
- `chat-ui.js` — Chat UI with collapsible tool-call blocks

## Configuration
- `app/layers-input.json` — Static config: STAC catalog URL, collection IDs, map view
- `config.json` — Generated at deploy time by k8s (LLM models + API keys from secrets)
- Both are merged by `main.js` at startup; runtime config overrides static config

## Deployment
Deployment is managed via Kubernetes. The application runs in an nginx container that clones the repo on startup.

**To deploy changes:**
1. Commit and push changes to the `main` branch.
2. Restart the deployment:
   ```bash
   kubectl rollout restart deployment/ca-lands
   ```

**Kubernetes Resources:**
- Manifests are in the `k8s/` directory.
- See `k8s/README.md` for detailed deployment and secret management instructions.

## Development
- Local: `cd app && python -m http.server 8000`
- Create a local `app/config.json` with LLM model configs for development
- `config.json` is in `.gitignore` — never committed (contains API keys)

