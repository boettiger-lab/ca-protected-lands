# Wetlands MapLibre Application

An interactive web application combining MapLibre GL JS for geospatial visualization with an AI-powered chatbot that can analyze wetlands data and control map layers.

## Features

- **Interactive Map** with key California conservation datasets:
  - Vulnerable Carbon Storage - raster COG
  - Species Richness (biodiversity) - raster COG
  - Protected Areas (WDPA/CPAD) - PMTiles polygons

- **AI Chatbot** powered by LLM + Model Context Protocol (MCP):
  - Natural language queries about biodiversity data
  - Statistical analysis using DuckDB on GeoParquet files
  - Dynamic map layer control
  - "Add Layer", "Filter Layer", and "Style Layer" capabilities

- **Chatbot-Controlled Map Layers** - The chatbot can show, hide, filter, and style map layers based on conversation context.

## Deployment

This application is designed to be deployed on Kubernetes. See the [k8s directory](../k8s) for deployment manifests and instructions.

The application expects a `config.json` file to be present at runtime. In the Kubernetes deployment, this file is generated automatically from a ConfigMap template (`k8s/configmap-nginx.yaml`) with environment variables injected.

## Local Development

The application is optimized for Kubernetes deployment. For local development, you can serve the `app` directory with a static file server, but you must manually create a `config.json` file (see `k8s/configmap-nginx.yaml` for structure) and ensure you have access to the necessary MCP servers and LLM endpoints.

## Example Chatbot Queries

- "Show me protected areas in California"
- "Filter protected areas to show only those with IUCN Category Ia"
- "Color the protected areas by ownership type"
- "Show me places with high species richness for birds"
- "What is the total carbon storage in protected areas?"

**Layer Control:**
The chatbot can programmatically control the map using tools:
- `add_layer`: Show a layer
- `remove_layer`: Hide a layer
- `filter_layer`: Apply filters (e.g. specific species groups or vector attributes)
- `style_layer`: Change visual styling (e.g. colors)

## File Structure

```
app/
├── index.html              # Main HTML page
├── map.js                  # MapLibre map setup and MapController
├── chat.js                 # Chatbot UI and MCP integration
├── mcp-tools.js            # Generic MCP tool generation
├── layer-registry.js       # Layer metadata management
├── layers-config.json      # Layer configuration
├── style.css               # Map styling
├── chat.css                # Chatbot styling
└── system-prompt.md        # Chatbot system prompt
```

## Data Sources

All data is served from MinIO S3-compatible storage:

- **Carbon**: Vulnerable Carbon Storage (raster COG)
- **Species Richness**: Biodiversity richness layers (raster COG)
- **WDPA**: World Database on Protected Areas (vector PMTiles)

Data is stored as:
- **COG** (Cloud-Optimized GeoTIFF) for raster layers
- **PMTiles** for vector polygon layers
- **GeoParquet** for tabular data accessed via MCP/DuckDB

## Supported LLM Providers

Any OpenAI-compatible API:
- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **Nautilus LLM Proxy**: `https://llm-proxy.nrp-nautilus.io/v1`


## Development

### Debugging

Open browser console to see:
- Layer loading events
- Layer visibility changes
- MCP communication

## License

See main project README for licensing information.
