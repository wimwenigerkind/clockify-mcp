import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const templateIdSchema = z.string().describe('The ID of the template');

export function registerTemplateTools(server: McpServer) {
    defineTool(server, {
        name: 'get_templates',
        title: 'Get Templates',
        description: 'Get all templates on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter by template name'),
            cleansed: z.boolean().optional().describe('Return cleansed templates'),
            hydrated: z.boolean().optional().describe('Return hydrated templates'),
            ...pageSchema,
        },
        action: 'fetch templates',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/templates`, {query}),
    });

    defineTool(server, {
        name: 'add_template',
        title: 'Add Template',
        description: 'Create a template on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the template'),
            projectsAndTasks: z
                .array(
                    z.object({
                        projectId: z.string().describe('ID of the project'),
                        taskIds: z.array(z.string()).optional().describe('IDs of the tasks'),
                    })
                )
                .optional()
                .describe('Projects and tasks contained in the template'),
            timeEntryIds: z.array(z.string()).optional().describe('IDs of time entries to include'),
            timeViewMode: z.string().optional().describe('Time view mode, e.g. DAY or WEEK'),
            weekStart: z.string().optional().describe('First day of the week, e.g. MONDAY'),
        },
        action: 'add template',
        handler: async ({workspaceId: _, ...template}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/templates`, {
                method: 'POST',
                body: [template],
            }),
    });

    defineTool(server, {
        name: 'update_template',
        title: 'Update Template',
        description: 'Rename a template',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            templateId: templateIdSchema,
            name: z.string().describe('New name of the template'),
        },
        action: 'update template',
        handler: async ({templateId, name}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/templates/${templateId}`, {
                method: 'PATCH',
                body: {name},
            }),
    });

    defineTool(server, {
        name: 'get_template',
        title: 'Get Template',
        description: 'Get a template by ID',
        inputSchema: {workspaceId: workspaceIdSchema, templateId: templateIdSchema},
        action: 'fetch template',
        handler: async ({templateId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/templates/${templateId}`),
    });

    defineTool(server, {
        name: 'delete_template',
        title: 'Delete Template',
        description: 'Delete a template',
        inputSchema: {workspaceId: workspaceIdSchema, templateId: templateIdSchema},
        action: 'delete template',
        handler: async ({templateId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/templates/${templateId}`, {
                method: 'DELETE',
            }),
    });
}
