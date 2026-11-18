import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, rateSchema, workspaceIdSchema} from './helpers.js';

export const roleSchema = z.enum(['WORKSPACE_ADMIN', 'OWNER', 'TEAM_MANAGER', 'PROJECT_MANAGER']);

export function registerWorkspaceTools(server: McpServer) {
    defineTool(server, {
        name: 'get_workspaces',
        title: 'Get Workspaces',
        description: 'Get all available workspaces for the authenticated user',
        inputSchema: {
            roles: z.array(roleSchema).optional().describe('Filter by workspace roles'),
        },
        action: 'fetch workspaces',
        handler: ({roles}) => clockifyRequest('/workspaces', {query: {roles}}),
    });

    defineTool(server, {
        name: 'get_workspace',
        title: 'Get Workspace',
        description: 'Get a workspace by ID (defaults to active workspace)',
        inputSchema: {workspaceId: workspaceIdSchema},
        action: 'fetch workspace',
        handler: async (_, {workspaceId}) => clockifyRequest(`/workspaces/${await workspaceId()}`),
    });

    defineTool(server, {
        name: 'add_workspace',
        title: 'Add Workspace',
        description: 'Create a new workspace',
        inputSchema: {
            name: z.string().describe('Name of the new workspace'),
            organizationId: z.string().optional().describe('ID of the organization'),
        },
        action: 'add workspace',
        handler: (body) => clockifyRequest('/workspaces', {method: 'POST', body}),
    });

    defineTool(server, {
        name: 'update_workspace_cost_rate',
        title: 'Update Workspace Cost Rate',
        description: 'Update the cost rate of a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...rateSchema},
        action: 'update workspace cost rate',
        handler: async ({amount, since}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/cost-rate`, {
                method: 'PUT',
                body: {amount, since},
            }),
    });

    defineTool(server, {
        name: 'update_workspace_hourly_rate',
        title: 'Update Workspace Billable Rate',
        description: 'Update the billable (hourly) rate of a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            ...rateSchema,
            currency: z.string().describe('Currency code of the rate, e.g. USD'),
        },
        action: 'update workspace hourly rate',
        handler: async ({amount, currency, since}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/hourly-rate`, {
                method: 'PUT',
                body: {amount, currency, since},
            }),
    });
}
