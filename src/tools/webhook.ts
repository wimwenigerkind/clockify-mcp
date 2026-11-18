import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, workspaceIdSchema} from './helpers.js';

const webhookIdSchema = z.string().describe('The ID of the webhook');

const webhookBodyShape = {
    name: z.string().min(2).max(30).describe('Webhook name (2-30 characters)'),
    url: z.string().describe('Endpoint URL that receives the webhook calls'),
    webhookEvent: z
        .string()
        .describe(
            'Event that triggers the webhook, e.g. NEW_TIME_ENTRY, NEW_PROJECT, TIMER_STOPPED'
        ),
    triggerSourceType: z
        .enum([
            'PROJECT_ID',
            'USER_ID',
            'TAG_ID',
            'TASK_ID',
            'WORKSPACE_ID',
            'ASSIGNMENT_ID',
            'EXPENSE_ID',
        ])
        .describe('Type of the trigger source IDs'),
    triggerSource: z.array(z.string()).describe('IDs of the trigger sources'),
};

export function registerWebhookTools(server: McpServer) {
    defineTool(server, {
        name: 'get_webhooks',
        title: 'Get Webhooks',
        description: 'Get all webhooks of a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            type: z
                .enum(['USER_CREATED', 'SYSTEM', 'ADDON'])
                .optional()
                .describe('Filter by webhook type'),
        },
        action: 'fetch webhooks',
        handler: async ({type}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks`, {query: {type}}),
    });

    defineTool(server, {
        name: 'get_addon_webhooks',
        title: 'Get Addon Webhooks',
        description: 'Get all webhooks of an addon in a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            addonId: z.string().describe('The ID of the addon'),
        },
        action: 'fetch addon webhooks',
        handler: async ({addonId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/addons/${addonId}/webhooks`),
    });

    defineTool(server, {
        name: 'get_webhook',
        title: 'Get Webhook',
        description: 'Get a webhook by ID',
        inputSchema: {workspaceId: workspaceIdSchema, webhookId: webhookIdSchema},
        action: 'fetch webhook',
        handler: async ({webhookId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}`),
    });

    defineTool(server, {
        name: 'add_webhook',
        title: 'Add Webhook',
        description: 'Create a webhook in a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...webhookBodyShape},
        action: 'create webhook',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_webhook',
        title: 'Update Webhook',
        description: 'Update a webhook',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            webhookId: webhookIdSchema,
            ...webhookBodyShape,
        },
        action: 'update webhook',
        handler: async ({workspaceId: _, webhookId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_webhook',
        title: 'Delete Webhook',
        description: 'Delete a webhook',
        inputSchema: {workspaceId: workspaceIdSchema, webhookId: webhookIdSchema},
        action: 'delete webhook',
        handler: async ({webhookId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'get_webhook_logs',
        title: 'Get Webhook Logs',
        description: 'Get delivery logs of a webhook',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            webhookId: webhookIdSchema,
            page: z.number().int().min(0).optional().describe('Page number (default 0)'),
            size: z.number().int().min(1).optional().describe('Page size (default 50)'),
            from: z.string().optional().describe('Start of the range (ISO 8601 date-time)'),
            to: z.string().optional().describe('End of the range (ISO 8601 date-time)'),
            sortByNewest: z.boolean().optional().describe('Sort newest logs first'),
            status: z.enum(['ALL', 'SUCCEEDED', 'FAILED']).optional().describe('Filter by status'),
        },
        action: 'fetch webhook logs',
        handler: async ({webhookId, page, size, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}/logs`, {
                method: 'POST',
                query: {page, size},
                body,
            }),
    });

    defineTool(server, {
        name: 'get_webhook_statuses',
        title: 'Get Webhook Statuses',
        description: 'Get delivery statuses of a webhook',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            webhookId: webhookIdSchema,
            page: z.number().int().min(0).optional().describe('Page number (default 0)'),
            size: z.number().int().min(1).optional().describe('Page size (default 50)'),
            statuses: z
                .array(z.enum(['SUCCEEDED', 'RETRYING', 'FAILED']))
                .optional()
                .describe('Filter by delivery statuses'),
        },
        action: 'fetch webhook statuses',
        handler: async ({webhookId, page, size, statuses}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}/statuses`, {
                query: {page, size, statuses},
            }),
    });

    defineTool(server, {
        name: 'regenerate_webhook_token',
        title: 'Regenerate Webhook Token',
        description: 'Generate a new webhook token and invalidate the previous one',
        inputSchema: {workspaceId: workspaceIdSchema, webhookId: webhookIdSchema},
        action: 'regenerate webhook token',
        handler: async ({webhookId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/webhooks/${webhookId}/token`, {
                method: 'PATCH',
            }),
    });
}
