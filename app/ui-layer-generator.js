/**
 * UI Layer Generator
 * 
 * Dynamically generates layer control UI based on LayerRegistry metadata.
 * Handles:
 * - Layer visibility toggles (checkboxes)
 * - Parameterized layer controls (radios, selects)
 * - Event binding to MapController
 */

import { layerRegistry } from './layer-registry.js';

export class UILayerGenerator {
    constructor(containerId, mapController) {
        this.container = document.getElementById(containerId);
        this.mapController = mapController;
        if (!this.container) {
            console.error(`UILayerGenerator: Container '${containerId}' not found.`);
        }
    }

    /**
     * Generate controls for all registered layers
     */
    generateControls() {
        if (!this.container) return;

        this.container.innerHTML = ''; // Clear existing

        const layers = Array.from(layerRegistry.layers.values());

        // Group layers? For now just flat list, maybe group by type later if needed.
        // Or we could add a 'group' property to config.

        layers.forEach(layer => {
            const layerControl = this.createLayerControl(layer);
            this.container.appendChild(layerControl);
        });
    }

    /**
     * Create the control element for a single layer
     */
    createLayerControl(layer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'layer-item';
        wrapper.style.marginBottom = '8px';

        // 1. Visibility Checkbox
        const checkboxLabel = document.createElement('label');
        checkboxLabel.style.display = 'flex';
        checkboxLabel.style.alignItems = 'center';
        checkboxLabel.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = layer.checkboxId || `${layer.key}-toggle`;
        checkbox.value = layer.key;
        checkbox.checked = false; // Default off, or check layer state? MapController might track it.

        // Bind visibility toggle
        checkbox.addEventListener('change', (e) => {
            this.mapController.setLayerVisibility(layer.key, e.target.checked);

            // Toggle params visibility if they exist
            if (paramsContainer) {
                paramsContainer.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        const labelText = document.createElement('span');
        labelText.textContent = ` ${layer.displayName}`;
        labelText.style.marginLeft = '8px';
        labelText.style.fontSize = '13px';

        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(labelText);
        wrapper.appendChild(checkboxLabel);

        // 2. Parameter Controls (if any)
        let paramsContainer = null;
        if (layer.params) {
            paramsContainer = document.createElement('div');
            paramsContainer.className = 'layer-params';
            paramsContainer.style.display = 'none'; // Hidden by default
            paramsContainer.style.marginLeft = '20px';
            paramsContainer.style.marginTop = '4px';
            paramsContainer.style.paddingLeft = '8px';
            paramsContainer.style.borderLeft = '2px solid #ddd';

            for (const [paramKey, paramConfig] of Object.entries(layer.params)) {
                const control = this.createParamControl(layer.key, paramKey, paramConfig);
                paramsContainer.appendChild(control);
            }
            wrapper.appendChild(paramsContainer);
        }

        return wrapper;
    }

    /**
     * Create a specific parameter control (radio, select, etc.)
     */
    createParamControl(layerKey, paramKey, config) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '6px';

        // Label
        if (config.label) {
            const label = document.createElement('label');
            label.textContent = config.label;
            label.style.display = 'block';
            label.style.fontSize = '11px';
            label.style.color = '#666';
            label.style.marginBottom = '2px';
            wrapper.appendChild(label);
        }

        // Input
        if (config.type === 'radio') {
            const radioGroup = document.createElement('div');
            config.options.forEach(opt => {
                const label = document.createElement('label');
                label.style.marginRight = '10px';
                label.style.fontSize = '12px';
                label.style.cursor = 'pointer';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `${layerKey}-${paramKey}`;
                radio.value = opt.value;
                radio.checked = opt.default || false;

                radio.addEventListener('change', () => this.handleParamChange(layerKey));

                label.appendChild(radio);
                label.appendChild(document.createTextNode(` ${opt.label}`));
                radioGroup.appendChild(label);
            });
            wrapper.appendChild(radioGroup);

        } else if (config.type === 'select') {
            const select = document.createElement('select');
            select.name = `${layerKey}-${paramKey}`;
            select.style.width = '100%';
            select.style.fontSize = '12px';
            select.style.padding = '2px';

            config.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                option.selected = opt.default || false;
                select.appendChild(option);
            });

            select.addEventListener('change', () => this.handleParamChange(layerKey));
            wrapper.appendChild(select);
        }

        return wrapper;
    }

    /**
     * Handle parameter changes by aggregating all values and calling filterLayer
     */
    handleParamChange(layerKey) {
        const layer = layerRegistry.get(layerKey);
        if (!layer || !layer.params) return;

        const params = {};

        for (const [paramKey, config] of Object.entries(layer.params)) {
            let value;
            if (config.type === 'radio') {
                const checked = document.querySelector(`input[name="${layerKey}-${paramKey}"]:checked`);
                value = checked ? checked.value : null;
            } else if (config.type === 'select') {
                const select = document.querySelector(`select[name="${layerKey}-${paramKey}"]`);
                value = select ? select.value : null;
            }
            params[paramKey] = value;
        }

        console.log(`[UILayerGenerator] Updating layer '${layerKey}' params:`, params);
        this.mapController.filterLayer(layerKey, params);
    }
}
