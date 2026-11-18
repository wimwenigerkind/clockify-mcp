import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerClientTools} from './client.js';
import {registerExpenseTools} from './expense.js';
import {registerInvoiceTools} from './invoice.js';
import {registerProjectTools} from './project.js';
import {registerTagTools} from './tag.js';
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
    registerTagTools(server);
    registerTimeEntryTools(server);
    registerExpenseTools(server);
    registerInvoiceTools(server);
}
