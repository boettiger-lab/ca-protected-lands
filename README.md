# California Protected Lands

A map-based application for exploring California's protected lands with an integrated LLM chatbot for natural language queries and analysis.

## Overview

This application provides an interactive map interface for exploring protected areas in California, powered by STAC (SpatioTemporal Asset Catalog) for dynamic layer configuration and DuckDB for analytical queries. Users can interact with the map through natural language using the integrated AI chatbot.

## Architecture

```
layers-input.json           ← static config: STAC catalog, collection IDs, map view
config.json (k8s-generated) ← deploy-time config: LLM models + API keys from secrets
        │
    ┌───▼────────────────┐
    │  DatasetCatalog     │  Fetches STAC collections, builds unified records
    └───┬───────┬────────┘
        │       │
  ┌─────▼──┐  ┌▼──────────┐
  │MapMgr  │  │ToolRegistry│  Local map tools + remote MCP tools
  └────────┘  └─────┬──────┘
                    │
               ┌────▼───┐
               │ Agent   │  LLM orchestration loop (agentic tool-use)
               └────┬───┘
                    │
               ┌────▼───┐
               │ChatUI   │  Thin DOM shell (messages, tool blocks, model picker)
               └────────┘
```

### Data Sources

Each dataset is available in two forms:
- **Visual layer** (PMTiles or COG via TiTiler) — rendered on the map
- **Parquet layer** (H3-indexed, on S3) — queried via DuckDB through MCP

The STAC catalog at `s3-west.nrp-nautilus.io` is the single source of truth for metadata.

## Configuration

### Layer Configuration

Layers are configured in [`app/layers-input.json`](app/layers-input.json):

```json
{
    "catalog": "https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json",
    "titiler_url": "https://titiler.nrp-nautilus.io",
    "mcp_url": "https://duckdb-mcp.nrp-nautilus.io/mcp",
    "view": { "center": [-119.4, 36.8], "zoom": 6 },
    "collections": ["cpad-2025b", "irrecoverable-carbon"]
}
```

Just list STAC collection IDs — assets, schemas, and display names are discovered from the catalog at runtime.

### LLM / API Keys

LLM models and API keys are injected at deploy time via the k8s ConfigMap (`config.json`). See [`k8s/README.md`](k8s/README.md).

## Development

### Prerequisites
- A modern browser with ES module support
- Python 3 (for local HTTP server)

### Running Locally

```bash
cd app && python -m http.server 8000
```

For local development without k8s secrets, create `app/config.json` manually:
```json
{
    "llm_models": [
        { "value": "glm-4.7", "label": "GLM-4.7", "endpoint": "https://llm-proxy.nrp-nautilus.io/v1", "api_key": "EMPTY" }
    ]
}
```

### Project Structure

```
app/
├── main.js              # Bootstrap — wires all modules together
├── dataset-catalog.js   # STAC catalog → unified dataset records
├── map-manager.js       # MapLibre GL init + layer/filter/style API
├── map-tools.js         # 9 local tools for the LLM agent
├── tool-registry.js     # Unified registry for local + MCP tools
├── mcp-client.js        # MCP transport wrapper (lazy reconnect)
├── agent.js             # LLM orchestration loop (agentic tool-use)
├── chat-ui.js           # Chat UI with collapsible tool blocks
├── system-prompt.md     # Base LLM system prompt
├── layers-input.json    # Static config (collections, view, URLs)
├── index.html           # HTML shell
├── style.css            # Map + layer control styles
└── chat.css             # Chat interface styles

k8s/
├── deployment.yaml      # Deployment with git-clone init container + nginx
├── configmap-nginx.yaml # config.json template + nginx config
├── service.yaml         # ClusterIP service
├── ingress.yaml         # Ingress for ca-lands.nrp-nautilus.io
└── README.md            # Deployment guide
```

## Deployment

The application is deployed on Kubernetes using nginx to serve static files. An init container clones the repo on each pod start.

```bash
# After pushing changes to main:
kubectl rollout restart deployment/ca-lands
kubectl rollout status deployment/ca-lands
```

See [`k8s/README.md`](k8s/README.md) for full deployment instructions.

