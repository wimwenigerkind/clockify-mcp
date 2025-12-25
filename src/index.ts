#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
    ClockifyProject,
    ClockifyTask,
    ClockifyTimeEntry,
} from './types/clockify.js';
import { clockifyRequest } from './api/client.js';
import {registerWorkspaceTools} from "./tools/workspace.js";
import {formatJsonResponse} from "./utils/response-formatters.js";
import {registerUserTools} from "./tools/user.js";
import {registerClientTools} from "./tools/client.js";
import {registerProjectTools} from "./tools/project.js";
import {registerTimeEntryTools} from "./tools/time-entry.js";

export const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;
export const CLOCKIFY_API_BASE_URL = (process.env.CLOCKIFY_API_BASE_URL ??
    'https://api.clockify.me/api/v1') as string;
export const JSON_INDENT_SPACES = 2;

if (!CLOCKIFY_API_KEY) {
    console.error('Error: CLOCKIFY_API_KEY environment variable is required');
    process.exit(1);
}

const server = new McpServer({
    name: 'clockify-server',
    version: '0.0.1',
});

registerUserTools(server);
registerWorkspaceTools(server);
registerClientTools(server);
registerProjectTools(server);
registerTimeEntryTools(server);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Clockify MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
