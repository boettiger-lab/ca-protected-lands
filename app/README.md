# Biodiversity Map Application

Interactive map + AI data analyst for geospatial biodiversity data.  
MapLibre GL JS on the front end, LLM-powered chat with MCP (Model Context Protocol) for SQL analytics.

## Architecture

```
layers-input.json   ← which STAC collections this app uses + LLM/MCP config
        │
    ┌───▼────────────────┐
    │  DatasetCatalog     │  Fetches STAC, builds unified records
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

### Modules

| File | Responsibility |
|---|---|
| `main.js` | Bootstrap — wires everything together |
| `dataset-catalog.js` | Loads STAC collections, builds unified dataset records |
| `map-manager.js` | Creates MapLibre map, manages layers/filters/styles |
| `map-tools.js` | 9 local tools the LLM can call (show/hide/filter/style + dataset info) |
| `tool-registry.js` | Unified registry for local + remote (MCP) tools, single dispatch |
| `mcp-client.js` | MCP transport wrapper — connect, lazy reconnect, callTool |
| `agent.js` | LLM orchestration loop — agentic while-loop with tool-use |
| `chat-ui.js` | Chat UI with collapsible tool-call blocks |
| `system-prompt.md` | Base system prompt (catalog appended at runtime) |
| `layers-input.json` | App config: STAC catalog URL, collection IDs, LLM models |

### Data flow

1. **STAC catalog** is the single source of truth for dataset metadata
2. Each STAC collection provides both **visual assets** (PMTiles/COG) and **parquet assets** (H3-indexed)
3. The agent can **query parquet** via the MCP SQL tool and **control the map** via local tools
4. Tool schemas are cleaned for broad LLM compatibility (handles `anyOf`, embedded XML tool calls, etc.)

## Configuration

Edit `layers-input.json`:

```json
{
    "catalog": "https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json",
    "titiler_url": "https://titiler.nrp-nautilus.io",
    "mcp_url": "https://duckdb-mcp.nrp-nautilus.io/mcp",
    "view": { "center": [-119.4, 36.8], "zoom": 6 },
    "collections": ["cpad-2025b", "irrecoverable-carbon"],
    "llm_models": [
        { "label": "GLM-4.7", "value": "glm-4.7", "endpoint": "https://llm-proxy.nrp-nautilus.io/v1", "api_key": "EMPTY" }
    ]
}
```

- **`collections`**: list of STAC collection IDs this app should load. Can be strings or objects with overrides.
- **`llm_models`**: model selector entries. Each needs `endpoint` and `api_key`.

## Tool architecture

**Local tools** (auto-approved, instant):
- `show_layer`, `hide_layer`, `set_filter`, `clear_filter`, `set_style`, `reset_style`, `get_map_state`
- `list_datasets`, `get_dataset_details`

**Remote tools** (require user approval):
- `query(sql_query)` — DuckDB SQL via MCP server

The agent runs an agentic loop: call LLM → if tool_calls → approve/execute → feed results → repeat.

## Local development

Serve the `app/` directory with any static file server:

```bash
cd app && python -m http.server 8000
```

## Deployment

See [k8s/](../k8s/) for Kubernetes manifests.
