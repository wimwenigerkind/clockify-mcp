import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const tagIdSchema = z.string().describe('The ID of the tag');

export function registerTagTools(server: McpServer) {
    defineTool(server, {
        name: 'get_tags_on_workspace',
        title: 'Get Tags on Workspace',
        description: 'Get all tags on a workspace (defaults to active workspace)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter tags by name'),
            'strict-name-search': z
                .boolean()
                .optional()
                .describe('Only return tags whose name exactly matches the name filter'),
            excludedIds: z.array(z.string()).optional().describe('Tag IDs to exclude'),
            archived: z.boolean().optional().describe('Filter by archived status'),
            'sort-column': z.enum(['NAME']).optional().describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch tags on workspace',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/tags`, {query}),
    });

    defineTool(server, {
        name: 'get_tag',
        title: 'Get Tag',
        description: 'Get a tag by ID',
        inputSchema: {workspaceId: workspaceIdSchema, tagId: tagIdSchema},
        action: 'fetch tag',
        handler: async ({tagId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/tags/${tagId}`),
    });

    defineTool(server, {
        name: 'add_tag',
        title: 'Add Tag',
        description: 'Create a new tag on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the tag'),
        },
        action: 'add tag',
        handler: async ({name}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/tags`, {
                method: 'POST',
                body: {name},
            }),
    });

    defineTool(server, {
        name: 'update_tag',
        title: 'Update Tag',
        description: 'Update a tag (name, archived status)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            tagId: tagIdSchema,
            name: z.string().describe('New name of the tag'),
            archived: z.boolean().optional().describe('Whether the tag is archived'),
        },
        action: 'update tag',
        handler: async ({tagId, name, archived}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/tags/${tagId}`, {
                method: 'PUT',
                body: {name, archived},
            }),
    });

    defineTool(server, {
        name: 'delete_tag',
        title: 'Delete Tag',
        description: 'Delete a tag',
        inputSchema: {workspaceId: workspaceIdSchema, tagId: tagIdSchema},
        action: 'delete tag',
        handler: async ({tagId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/tags/${tagId}`, {
                method: 'DELETE',
            }),
    });
}
