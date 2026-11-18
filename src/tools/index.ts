import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerApprovalTools} from './approval.js';
import {registerClientTools} from './client.js';
import {registerCustomFieldTools} from './custom-field.js';
import {registerEntityTools} from './entity.js';
import {registerExpenseTools} from './expense.js';
import {registerInvoiceTools} from './invoice.js';
import {registerProjectTools} from './project.js';
import {registerReportTools} from './report.js';
import {registerTagTools} from './tag.js';
import {registerTaskTools} from './task.js';
import {registerTemplateTools} from './template.js';
import {registerTimeEntryTools} from './time-entry.js';
import {registerUserGroupTools} from './user-group.js';
import {registerUserTools} from './user.js';
import {registerWebhookTools} from './webhook.js';
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
    registerTemplateTools(server);
    registerEntityTools(server);
    registerReportTools(server);
    registerApprovalTools(server);
    registerWebhookTools(server);
    registerCustomFieldTools(server);
}
