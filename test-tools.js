#!/usr/bin/env node
/**
 * Unit test for chat.js tool generation and execution
 * Tests that local map tools are properly registered and have correct descriptions
 */

import { layerRegistry } from './app/layer-registry.js';
import { generateTools } from './app/mcp-tools.js';

// Mock MapController
const mockMapController = {
    setLayerVisibility: (layerId, visible) => {
        return JSON.stringify({ success: true, layerId, visible });
    },
    filterLayer: (layerId, filter) => {
        return JSON.stringify({ success: true, layerId, filter });
    },
    styleLayer: (layerId, style) => {
        return JSON.stringify({ success: true, layerId, style });
    },
    getLayerInfo: () => {
        return JSON.stringify({
            layers: ['cpad', 'carbon'],
            visible: { cpad: false, carbon: false }
        });
    }
};

async function testToolGeneration() {
    console.log('=== Testing Tool Generation ===\n');

    // Manually add test layers to registry
    layerRegistry.layers = new Map([
        ['carbon', {
            key: 'carbon',
            displayName: 'Vulnerable Carbon',
            isVector: false,
            type: 'cog'
        }],
        ['cpad', {
            key: 'cpad',
            displayName: 'California Protected Areas',
            isVector: true,
            type: 'vector',
            filterableProperties: {
                'GAP_Sts': { type: 'string', description: 'GAP Status code' },
                'Mang_Type': { type: 'string', description: 'Manager Type' }
            }
        }]
    ]);

    console.log('✓ Registered layers:', Array.from(layerRegistry.layers.keys()).join(', '));

    // Generate tools
    const tools = generateTools(layerRegistry, mockMapController);

    console.log(`\n✓ Generated ${tools.length} tools:\n`);

    tools.forEach(tool => {
        console.log(`  - ${tool.name}`);
        console.log(`    Description: ${tool.description.substring(0, 150)}...`);
        console.log(`    Parameters:`, Object.keys(tool.inputSchema.properties).join(', '));
        console.log('');
    });

    return tools;
}

function testToolExecution(tools) {
    console.log('\n=== Testing Tool Execution ===\n');

    const testCases = [
        {
            name: 'add_layer',
            args: { layer_id: 'carbon' },
            expectedTool: 'add_layer'
        },
        {
            name: 'remove_layer',
            args: { layer_id: 'carbon' },
            expectedTool: 'remove_layer'
        },
        {
            name: 'filter_layer',
            args: {
                layer_id: 'cpad',
                filter: ['==', 'GAP_Sts', '1']
            },
            expectedTool: 'filter_layer'
        },
        {
            name: 'style_layer',
            args: {
                layer_id: 'cpad',
                style: { 'fill-color': 'red' }
            },
            expectedTool: 'style_layer'
        }
    ];

    testCases.forEach(test => {
        const tool = tools.find(t => t.name === test.expectedTool);
        if (!tool) {
            console.log(`❌ Tool ${test.expectedTool} not found!`);
            return;
        }

        try {
            const result = tool.execute(test.args);
            console.log(`✓ ${test.name}:`, result);
        } catch (err) {
            console.log(`❌ ${test.name} failed:`, err.message);
        }
    });
}

function analyzeToolDescriptions(tools) {
    console.log('\n=== Analyzing Tool Descriptions for LLM ===\n');

    const addLayerTool = tools.find(t => t.name === 'add_layer');
    const getLayerInfoTool = tools.find(t => t.name === 'get_layer_info');

    console.log('add_layer description:');
    console.log(addLayerTool.description);
    console.log('\n---\n');

    console.log('get_layer_info description:');
    console.log(getLayerInfoTool.description);
    console.log('\n---\n');

    // Check if descriptions make it clear when to use each tool
    const addLayerHasShowKeywords = /show|display|visualize|add/i.test(addLayerTool.description);
    const getLayerInfoHasListKeywords = /list|available|what.*layers/i.test(getLayerInfoTool.description);

    console.log('Analysis:');
    console.log(`  add_layer mentions show/display: ${addLayerHasShowKeywords}`);
    console.log(`  get_layer_info mentions list/available: ${getLayerInfoHasListKeywords}`);

    if (!addLayerHasShowKeywords) {
        console.log('\n⚠️  WARNING: add_layer description should mention "show" or "display"');
    }

    if (!getLayerInfoHasListKeywords) {
        console.log('\n⚠️  WARNING: get_layer_info description should mention "list" or "available"');
    }
}

// Run tests
async function main() {
    try {
        const tools = await testToolGeneration();
        testToolExecution(tools);
        analyzeToolDescriptions(tools);

        console.log('\n=== Test Complete ===\n');
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

main();
