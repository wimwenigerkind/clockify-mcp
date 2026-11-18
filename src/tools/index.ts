import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerClientTools} from './client.js';
import {registerProjectTools} from './project.js';
import {registerTaskTools} from './task.js';
import {registerTimeEntryTools} from './time-entry.js';
import {registerUserGroupTools} from './user-group.js';
import {registerUserTools} from './user.js';
import {registerWorkspaceTools} from './workspace.js';

export function registerAllTools(server: McpServer) {
    registerWorkspaceTools(server);
    registerUserTools(server);
    registerUserGroupTools(server);
    registerClientTools(server);
    registerProjectTools(server);
    registerTaskTools(server);
    registerTimeEntryTools(server);
}
