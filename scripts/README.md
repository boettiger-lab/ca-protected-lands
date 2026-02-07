# Layer Configuration

This directory contains example configuration for the CA Protected Lands map application.

## Runtime Configuration (Current Approach)

The application now generates layer configurations **dynamically at runtime** by fetching STAC catalog metadata directly in the browser.

### Configuration File

Edit [`app/layers-input.json`](../app/layers-input.json) to specify which STAC collections and assets to load:

```json
{
    "catalog": "https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json",
    "titiler_url": "https://titiler.nrp-nautilus.io",
    "view": {
        "center": [-119.4179, 36.7783],
        "zoom": 6
    },
    "layers": [
        {
            "collection_id": "cpad-2025b",
            "asset_id": "cpad-units-pmtiles",
            "layer_key": "cpad",
            "display_name": "California Protected Areas (CPAD)",
            "options": {
                "source_layer": "cpad-2025b-units"
            }
        }
    ]
}
```

### How It Works

1. On map load, [`app/config-loader.js`](../app/config-loader.js) fetches `layers-input.json`
2. For each layer, it:
   - Traverses the STAC catalog to find the collection
   - Fetches collection metadata
   - Extracts `table:columns` for vector layer properties
   - Builds the full layer configuration
   - Registers it with the layer registry
3. The map initializes with the dynamically loaded layers

### Benefits

- **No build step required** - changes to `layers-input.json` take effect immediately
- **Always up-to-date** - reflects current STAC metadata
- **Simpler workflow** - no Python scripts to run

## Configuration Reference

### Required Fields

- `collection_id`: STAC collection ID
- `asset_id`: Asset ID from the collection
- `layer_key`: Unique key for the layer

### Optional Fields

- `display_name`: Layer display name (defaults to STAC asset title)
- `options.colormap`: Colormap for raster layers (default: "reds")
- `options.rescale`: Rescale range for rasters (e.g., "0,100")
- `options.source_layer`: Source layer name for PMTiles

### Auto-Extracted from STAC

- Attribution (from collection providers/links)
- Filterable properties (from `table:columns` for vector layers)
- Asset URLs and types
- Layer metadata

## Finding Collections and Assets

Browse the STAC catalog:
- **STAC Browser**: https://radiantearth.github.io/stac-browser/#/external/s3-west.nrp-nautilus.io/public-data/stac/catalog.json
- **Catalog JSON**: https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json

## Example Input File

See [`layers-input-example.json`](layers-input-example.json) for a complete example configuration.

