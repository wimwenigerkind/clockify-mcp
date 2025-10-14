#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';
const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;

if (!CLOCKIFY_API_KEY) {
    console.error('Error: CLOCKIFY_API_KEY environment variable is required');
    process.exit(1);
}

const server = new McpServer({
    name: 'clockify-server',
    version: '1.0.0',
});

async function clockifyRequest(
    endpoint: string,
    apiKey: string,
    method = 'GET',
    body?: any
) {
    const response = await fetch(`${CLOCKIFY_API_BASE}${endpoint}`, {
        method,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `Clockify API error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.text();
            if (errorBody) {
                errorMessage += ` - ${errorBody}`;
            }
        } catch (e) {
        }
        throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    return null;
}

// Tool: Get current user
server.registerTool(
    'get_current_user',
    {
        description: 'Get information about the currently authenticated Clockify user',
        inputSchema: {},
    },
    async () => {
        const user = await clockifyRequest('/user', CLOCKIFY_API_KEY);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        activeWorkspace: user.activeWorkspace,
                    }, null, 2)
                }
            ],
        };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Clockify MCP Server running on stdio');