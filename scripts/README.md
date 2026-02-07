# STAC to Layers Config Generator

This directory contains a helper script to generate `layers-config.json` from STAC catalog entries.

## Usage

```bash
python scripts/stac-to-layers-config.py \
    --catalog https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json \
    --output app/layers-config.json \
    --layer COLLECTION_ID:ASSET_ID:LAYER_KEY:DISPLAY_NAME
```

### Examples

**Generate CPAD layer config:**
```bash
python scripts/stac-to-layers-config.py \
    --catalog https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json \
    --output test-config.json \
    --layer cpad-2025b:cpad-units-pmtiles:cpad:"California Protected Areas (CPAD)"
```

**Generate carbon layer config:**
```bash
python scripts/stac-to-layers-config.py \
    --catalog https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json \
    --output test-config.json \
    --layer irrecoverable-carbon:vulnerable-total-2018-cog:carbon:"Vulnerable Carbon"
```

**Generate both together:**
```bash
python scripts/stac-to-layers-config.py \
    --catalog https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json \
    --output app/layers-config-generated.json \
    --layer cpad-2025b:cpad-units-pmtiles:cpad:"California Protected Areas (CPAD)" \
    --layer irrecoverable-carbon:vulnerable-total-2018-cog:carbon:"Vulnerable Carbon"
```

## Arguments

- `--catalog`: URL to the STAC catalog.json file
- `--output`: Path where the layers-config.json should be written
- `--layer`: Layer specification in format `COLLECTION:ASSET:KEY:NAME` (can be repeated)
  - `COLLECTION`: STAC collection ID (e.g., `cpad-2025b`)
  - `ASSET`: Asset ID from the collection (e.g., `cpad-units-pmtiles`)
  - `KEY`: Layer key to use in the config (e.g., `cpad`)
  - `NAME`: Display name for the layer (optional, will use asset title if omitted)
- `--titiler`: TiTiler base URL for COG tiles (default: `https://titiler.nrp-nautilus.io`)
- `--colormap`: Default colormap for raster layers (default: `reds`)

## How It Works

1. **Reads the STAC catalog** to find collection URLs
2. **Fetches collection metadata** including assets, table columns, and attribution
3. **Detects layer type**:
   - PMTiles assets → vector layers with filterable properties
   - COG (GeoTIFF) assets → raster layers via TiTiler
4. **Extracts metadata**:
   - Display names from asset titles
   - Attribution from collection providers
   - Filterable properties from `table:columns` (for vector layers)
5. **Generates layer config** in the format expected by the application

## Finding Asset IDs

To find available collections and assets, browse the STAC catalog:
- **STAC Browser**: https://radiantearth.github.io/stac-browser/#/external/s3-west.nrp-nautilus.io/public-data/stac/catalog.json
- **Catalog JSON**: https://s3-west.nrp-nautilus.io/public-data/stac/catalog.json

Or use this command to list assets in a collection:
```bash
curl -s https://s3-west.nrp-nautilus.io/public-cpad/stac-collection.json | \
    python -m json.tool | grep -A 5 '"assets"'
```

## Notes

- The script automatically detects vector vs raster layers based on asset type
- For PMTiles layers, it extracts filterable properties from STAC `table:columns`
- For COG layers, it generates TiTiler tile URLs with appropriate colormaps
- Generated configs may need manual adjustment for:
  - Layer source-layer names (PMTiles)
  - Colormap settings (raster)
  - Additional UI parameters (like species_richness filters)
