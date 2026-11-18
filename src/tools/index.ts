import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerClientTools} from './client.js';
import {registerProjectTools} from './project.js';
import {registerTimeEntryTools} from './time-entry.js';
import {registerUserTools} from './user.js';
import {registerWorkspaceTools} from './workspace.js';

export function registerAllTools(server: McpServer) {
    registerWorkspaceTools(server);
    registerUserTools(server);
    registerClientTools(server);
    registerProjectTools(server);
    registerTimeEntryTools(server);
}
