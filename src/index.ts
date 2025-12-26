#!/usr/bin/env node

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {registerWorkspaceTools} from './tools/workspace.js';
import {registerUserTools} from './tools/user.js';
import {registerClientTools} from './tools/client.js';
import {registerProjectTools} from './tools/project.js';
import {registerTimeEntryTools} from './tools/time-entry.js';

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
