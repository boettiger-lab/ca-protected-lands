/**
 * ConfigLoader - Runtime configuration generation from STAC
 * 
 * Replaces scripts/stac-to-layers-config.py
 */

import { layerRegistry } from './layer-registry.js';

export class ConfigLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load configuration from input JSON and register layers
     * @param {string} url - URL to input JSON (e.g., 'layers-input.json')
     */
    async loadAndRegister(url) {
        try {
            console.log(`[ConfigLoader] Loading input config from ${url}...`);
            const inputConfig = await this.fetchJson(url);

            // Store view config if present
            if (inputConfig.view) {
                layerRegistry.registerFromConfig({ view: inputConfig.view });
            }

            const catalogUrl = inputConfig.catalog;
            const titilerUrl = inputConfig.titiler_url || 'https://titiler.nrp-nautilus.io';
            const defaultColormap = inputConfig.default_colormap || 'reds';

            console.log(`[ConfigLoader] Processing ${inputConfig.layers.length} layers from catalog ${catalogUrl}...`);

            // Process layers in parallel
            const promises = inputConfig.layers.map(spec =>
                this.processLayer(spec, catalogUrl, titilerUrl, defaultColormap)
            );

            const results = await Promise.allSettled(promises);

            // Log results
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            console.log(`[ConfigLoader] Successfully registered ${successCount}/${inputConfig.layers.length} layers.`);

            results.forEach((r, i) => {
                const layerKey = inputConfig.layers[i].layer_key;
                if (r.status === 'rejected') {
                    console.error(`[ConfigLoader] Failed to load layer '${layerKey}':`, r.reason);
                }
            });

        } catch (error) {
            console.error('[ConfigLoader] Fatal error loading config:', error);
            throw error;
        }
    }

    /**
     * Process a single layer specification
     */
    async processLayer(spec, catalogUrl, titilerUrl, defaultColormap) {
        const { collection_id, asset_id, layer_key, display_name, options = {} } = spec;

        // 1. Find collection URL
        const collectionUrl = await this.findCollectionUrl(catalogUrl, collection_id);
        if (!collectionUrl) {
            throw new Error(`Collection '${collection_id}' not found in catalog`);
        }

        // 2. Fetch collection
        const collection = await this.fetchJson(collectionUrl);

        // 3. Find asset
        const asset = collection.assets?.[asset_id];
        if (!asset) {
            throw new Error(`Asset '${asset_id}' not found in collection '${collection_id}'`);
        }

        // 4. Detect type
        const layerType = this.detectLayerType(asset);
        const assetHref = asset.href;
        const finalDisplayName = display_name || asset.title || collection.title || layer_key;

        // 5. Build attribution
        let attribution = "";
        const aboutLink = collection.links?.find(l => l.rel === 'about')?.href;
        const providerName = collection.providers?.[0]?.name;
        if (aboutLink && providerName) {
            attribution = `<a href="${aboutLink}" target="_blank">${providerName}</a>`;
        }

        let layerConfig = null;

        if (layerType === 'pmtiles') {
            const sourceLayerName = options.source_layer || layer_key;

            layerConfig = {
                displayName: finalDisplayName,
                layerIds: [`${layer_key}-layer`],
                checkboxId: `${layer_key}-layer`,
                hasLegend: false,
                isVector: true,
                sourceLayer: sourceLayerName,
                source: {
                    type: "vector",
                    url: `pmtiles://${assetHref}`,
                    attribution: attribution
                },
                layer: {
                    type: "fill",
                    "source-layer": sourceLayerName,
                    minzoom: 0,
                    maxzoom: 22,
                    paint: {
                        "fill-color": "#2E7D32",
                        "fill-opacity": 0.5
                    },
                    layout: {
                        visibility: "none"
                    }
                }
            };

            // Extract properties from table:columns
            const columns = collection['table:columns'];
            if (columns) {
                const filterable = {};
                for (const col of columns) {
                    if (['geometry', 'h10', 'h9', 'h8', 'h0'].includes(col.name)) continue;

                    filterable[col.name] = {
                        type: (col.type?.includes('float') || col.type?.includes('int')) ? 'number' : 'string',
                        description: col.description || ''
                    };
                }
                if (Object.keys(filterable).length > 0) {
                    layerConfig.filterableProperties = filterable;
                }
            }

        } else if (layerType === 'cog') {
            const colormap = options.colormap || defaultColormap;
            const rescale = options.rescale;

            let tilesUrl = `${titilerUrl}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(assetHref)}&colormap_name=${colormap}`;
            if (rescale) {
                tilesUrl += `&rescale=${rescale}`;
            }

            layerConfig = {
                displayName: finalDisplayName,
                layerIds: [`${layer_key}-layer`],
                checkboxId: `${layer_key}-layer`,
                hasLegend: false,
                isVector: false,
                source: {
                    type: "raster",
                    tiles: [tilesUrl],
                    tileSize: 256,
                    minzoom: 0,
                    maxzoom: 12,
                    attribution: attribution
                },
                layer: {
                    type: "raster",
                    paint: {
                        "raster-opacity": 0.7
                    },
                    layout: {
                        visibility: "none"
                    }
                }
            };
        } else {
            throw new Error(`Unknown layer type for asset '${asset_id}'`);
        }

        // Register the layer
        layerRegistry.register(layer_key, layerConfig);
    }

    async findCollectionUrl(catalogUrl, collectionId) {
        const catalog = await this.fetchJson(catalogUrl);

        for (const link of (catalog.links || [])) {
            if (link.rel === 'child') {
                const collectionUrl = new URL(link.href, catalogUrl).href;

                // Fetch child to check ID (could be optimized if links had titles/IDs)
                // Note: STAC API catalogs usually have 'item' or 'child' links. 
                // Static catalogs rely on traversing.
                // Optimally we'd check if the link href *ends* with the ID, but that's not guaranteed.
                // For now, mirroring Python script logic of fetching.

                // Optimization: Cache fetches
                const collection = await this.fetchJson(collectionUrl);
                if (collection.id === collectionId) {
                    return collectionUrl;
                }
            }
        }
        return null;
    }

    detectLayerType(asset) {
        const type = asset.type || '';
        const href = asset.href || '';

        if (type.toLowerCase().includes('pmtiles') || href.endsWith('.pmtiles')) {
            return 'pmtiles';
        }
        if (type.toLowerCase().includes('geotiff') || href.endsWith('.tif')) {
            return 'cog';
        }
        return 'unknown';
    }

    async fetchJson(url) {
        if (this.cache.has(url)) return this.cache.get(url);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        const json = await res.json();

        this.cache.set(url, json);
        return json;
    }
}

export const configLoader = new ConfigLoader();
