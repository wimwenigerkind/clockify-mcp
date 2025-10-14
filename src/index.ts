#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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