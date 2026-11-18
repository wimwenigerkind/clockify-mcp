import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, workspaceIdSchema} from './helpers.js';

const CHANGE_KINDS = [
    ['created', 'Created'],
    ['updated', 'Updated'],
    ['deleted', 'Deleted'],
] as const;

export function registerEntityTools(server: McpServer) {
    for (const [kind, label] of CHANGE_KINDS) {
        defineTool(server, {
            name: `get_${kind}_entities`,
            title: `Get ${label} Entities`,
            description: `Get entities ${kind} in a workspace within a period (experimental)`,
            inputSchema: {
                workspaceId: workspaceIdSchema,
                type: z
                    .array(z.string())
                    .min(1)
                    .describe(
                        'Entity types to include, e.g. TIME_ENTRY, PROJECT, TASK, CLIENT, TAG'
                    ),
                start: z.string().optional().describe('Start of the period (ISO 8601 date-time)'),
                end: z.string().optional().describe('End of the period (ISO 8601 date-time)'),
                page: z.number().int().min(1).optional().describe('Page number'),
                limit: z.number().int().min(1).optional().describe('Maximum number of items'),
            },
            action: `fetch ${kind} entities`,
            handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
                clockifyRequest(`/workspaces/${await workspaceId()}/entities/${kind}`, {query}),
        });
    }
}
