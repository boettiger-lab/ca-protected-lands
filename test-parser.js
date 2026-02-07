#!/usr/bin/env node
/**
 * Test the embedded tool call parser
 * This simulates what chat.js does when GLM-4.7 returns tool calls as XML tags
 */

// Mock local tools
const mockLocalTools = [
    { name: 'add_layer' },
    { name: 'remove_layer' },
    { name: 'get_layer_info' },
    { name: 'filter_layer' },
    { name: 'style_layer' }
];

// Minimal chatbot mock to test the parser
const mockChatbot = {
    localTools: mockLocalTools,

    isLocalTool(toolName) {
        return this.localTools.some(tool => tool.name === toolName);
    },

    // Copy of parseEmbeddedToolCalls from chat.js
    parseEmbeddedToolCalls(content) {
        if (!content) return [];

        const toolCalls = [];

        const tagPattern = /<tool_call>([^<]+)<\/tool_call>/gi;
        let match;

        while ((match = tagPattern.exec(content)) !== null) {
            const inner = match[1].trim();
            console.log('[Parser] Found embedded tool call tag:', inner);

            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(inner);
                if (parsed.name) {
                    toolCalls.push({
                        name: parsed.name,
                        args: parsed.arguments || {}
                    });
                    continue;
                }
            } catch (e) {
                // Not JSON, try other formats
            }

            // Try to parse as function call: tool_name(args)
            const funcMatch = inner.match(/^(\w+)\s*\((.+)\)$/s);
            if (funcMatch) {
                const name = funcMatch[1];
                try {
                    const args = JSON.parse(funcMatch[2]);
                    toolCalls.push({ name, args });
                    continue;
                } catch (e) {
                    console.log('[Parser] Could not parse args as JSON:', funcMatch[2]);
                }
            }

            // Simple tool name only (no args)
            if (/^\w+$/.test(inner)) {
                const toolName = inner;
                if (this.isLocalTool(toolName) || toolName === 'query') {
                    toolCalls.push({ name: toolName, args: {} });
                    continue;
                }
            }

            console.log('[Parser] Could not parse embedded tool call:', inner);
        }

        return toolCalls;
    }
};

// Test cases based on what GLM-4.7 actually outputs
const testCases = [
    {
        name: "Simple tool name (what GLM-4.7 outputs)",
        content: "I'll show you the carbon layer on the map.<tool_call>get_layer_info</tool_call>",
        expected: [{ name: 'get_layer_info', args: {} }]
    },
    {
        name: "Tool with JSON args",
        content: "Adding the layer now.<tool_call>add_layer({\"layer_id\": \"carbon\"})</tool_call>",
        expected: [{ name: 'add_layer', args: { layer_id: 'carbon' } }]
    },
    {
        name: "Full JSON format",
        content: "Here's the result<tool_call>{\"name\": \"filter_layer\", \"arguments\": {\"layer_id\": \"cpad\", \"filter\": [\"==\", \"GAP_Sts\", \"1\"]}}</tool_call>",
        expected: [{ name: 'filter_layer', args: { layer_id: 'cpad', filter: ['==', 'GAP_Sts', '1'] } }]
    },
    {
        name: "No tool calls",
        content: "I don't need to call any tools for this.",
        expected: []
    },
    {
        name: "Unknown tool (should not match)",
        content: "Calling <tool_call>unknown_tool</tool_call>",
        expected: []
    },
    {
        name: "Multiple tool calls",
        content: "First <tool_call>get_layer_info</tool_call> then <tool_call>add_layer({\"layer_id\": \"carbon\"})</tool_call>",
        expected: [
            { name: 'get_layer_info', args: {} },
            { name: 'add_layer', args: { layer_id: 'carbon' } }
        ]
    }
];

console.log('=== Embedded Tool Call Parser Tests ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, i) => {
    console.log(`Test ${i + 1}: ${test.name}`);
    console.log(`  Input: "${test.content.substring(0, 80)}..."`);

    const result = mockChatbot.parseEmbeddedToolCalls(test.content);

    const expectedStr = JSON.stringify(test.expected);
    const resultStr = JSON.stringify(result);

    if (expectedStr === resultStr) {
        console.log(`  ✅ PASS: ${JSON.stringify(result)}\n`);
        passed++;
    } else {
        console.log(`  ❌ FAIL`);
        console.log(`    Expected: ${expectedStr}`);
        console.log(`    Got:      ${resultStr}\n`);
        failed++;
    }
});

console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
