import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const clientIdSchema = z.string().describe('The ID of the client');

export function registerClientTools(server: McpServer) {
    defineTool(server, {
        name: 'get_clients_on_workspace',
        title: 'Get Clients on Workspace',
        description: 'Get all clients on a workspace (defaults to active workspace)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter clients by name (partial match)'),
            archived: z.boolean().optional().describe('Filter by archived status'),
            'sort-column': z.enum(['NAME']).optional().describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch clients on workspace',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/clients`, {query}),
    });

    defineTool(server, {
        name: 'get_client',
        title: 'Get Client',
        description: 'Get a client by ID',
        inputSchema: {workspaceId: workspaceIdSchema, clientId: clientIdSchema},
        action: 'fetch client',
        handler: async ({clientId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/clients/${clientId}`),
    });

    defineTool(server, {
        name: 'add_client',
        title: 'Add Client',
        description: 'Create a new client on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the client'),
            address: z.string().optional().describe('Address of the client'),
            note: z.string().optional().describe('Note about the client'),
        },
        action: 'add client',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/clients`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_client',
        title: 'Update Client',
        description: 'Update a client (name, address, note, archived status)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            clientId: clientIdSchema,
            name: z.string().describe('New name of the client'),
            address: z.string().optional().describe('New address of the client'),
            note: z.string().optional().describe('New note about the client'),
            archived: z.boolean().optional().describe('Whether the client is archived'),
            'archive-projects': z
                .boolean()
                .optional()
                .describe('Also archive all projects of the client when archiving it'),
            'mark-tasks-as-done': z
                .boolean()
                .optional()
                .describe('Mark tasks of archived projects as done'),
        },
        action: 'update client',
        handler: async (
            {
                workspaceId: _,
                clientId,
                'archive-projects': archiveProjects,
                'mark-tasks-as-done': markTasksAsDone,
                ...body
            },
            {workspaceId}
        ) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/clients/${clientId}`, {
                method: 'PUT',
                query: {'archive-projects': archiveProjects, 'mark-tasks-as-done': markTasksAsDone},
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_client',
        title: 'Delete Client',
        description: 'Delete a client (the client must be archived first)',
        inputSchema: {workspaceId: workspaceIdSchema, clientId: clientIdSchema},
        action: 'delete client',
        handler: async ({clientId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/clients/${clientId}`, {
                method: 'DELETE',
            }),
    });
}
