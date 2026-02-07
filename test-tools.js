#!/usr/bin/env node
/**
 * Comprehensive test to validate tool formatting for LLM API
 * Tests that local tools match the same format as MCP tools
 */

import { layerRegistry } from './app/layer-registry.js';
import { generateTools } from './app/mcp-tools.js';

// === Mock the same structures chat.js uses ===

// Mock MCP tool (simulating what comes from the MCP server)
const mockMcpTools = [
    {
        name: 'query',
        description: 'Execute a SQL query',
        inputSchema: {
            type: 'object',
            properties: {
                sql_query: {
                    type: 'string',
                    description: 'SQL query to execute'
                }
            },
            required: ['sql_query']
        }
    }
];

// Mock MapController
const mockMapController = {
    setLayerVisibility: (layerId, visible) => ({ success: true, layerId, visible }),
    filterLayer: (layerId, filter) => ({ success: true, layerId, filter }),
    styleLayer: (layerId, style) => ({ success: true, layerId, style }),
    getAvailableLayers: () => ['carbon', 'cpad']
};

async function runTest() {
    console.log('=== Tool Format Validation Test ===\n');

    // 1. Set up layer registry (mimicking what config-loader does)
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
                'GAP_Sts': { type: 'string', description: 'GAP Status code' }
            }
        }]
    ]);

    console.log('Layer registry:', Array.from(layerRegistry.layers.keys()).join(', '));

    // 2. Generate local tools (what mcp-tools.js does)
    const localTools = generateTools(layerRegistry, mockMapController);
    console.log('Generated', localTools.length, 'local tools\n');

    // 3. Format MCP tools (EXACTLY as chat.js does on line 754-770)
    const mcpToolsFormatted = mockMcpTools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema || {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'SQL query to execute'
                    }
                },
                required: ['query']
            }
        }
    }));

    // 4. Format local tools (EXACTLY as chat.js does on line 773-780)
    const localToolsFormatted = localTools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    }));

    // 5. Compare the structures
    console.log('=== MCP Tool Format (query - this works) ===');
    console.log(JSON.stringify(mcpToolsFormatted[0], null, 2));

    console.log('\n=== Local Tool Format (add_layer - this fails) ===');
    const addLayerTool = localToolsFormatted.find(t => t.function.name === 'add_layer');
    console.log(JSON.stringify(addLayerTool, null, 2));

    // 6. Validate structure matches
    console.log('\n=== Structure Validation ===');

    const mcpTool = mcpToolsFormatted[0];
    const localTool = addLayerTool;

    const checks = [
        ['Has type: "function"', mcpTool.type === 'function', localTool.type === 'function'],
        ['Has function.name', typeof mcpTool.function.name === 'string', typeof localTool.function.name === 'string'],
        ['Has function.description', typeof mcpTool.function.description === 'string', typeof localTool.function.description === 'string'],
        ['Has function.parameters', typeof mcpTool.function.parameters === 'object', typeof localTool.function.parameters === 'object'],
        ['parameters.type = "object"', mcpTool.function.parameters.type === 'object', localTool.function.parameters?.type === 'object'],
        ['Has parameters.properties', typeof mcpTool.function.parameters.properties === 'object', typeof localTool.function.parameters?.properties === 'object'],
        ['Has parameters.required', Array.isArray(mcpTool.function.parameters.required), Array.isArray(localTool.function.parameters?.required)]
    ];

    let allPass = true;
    checks.forEach(([name, mcpPass, localPass]) => {
        const status = mcpPass && localPass ? '✅' : '❌';
        if (!localPass) allPass = false;
        console.log(`${status} ${name}: MCP=${mcpPass}, Local=${localPass}`);
    });

    // 7. Full combined tools array (what actually gets sent to LLM)
    const allTools = [...mcpToolsFormatted, ...localToolsFormatted];
    console.log('\n=== Final Tools Array ===');
    console.log(`Total tools: ${allTools.length}`);
    console.log('Tool names:', allTools.map(t => t.function.name).join(', '));

    // 8. Print full payload for inspection
    console.log('\n=== Full API Payload (tools array) ===');
    console.log(JSON.stringify(allTools, null, 2));

    if (allPass) {
        console.log('\n✅ All validations passed - tool format looks correct');
    } else {
        console.log('\n❌ Some validations failed - check tool format');
    }
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
