import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, userIdSchema, workspaceIdSchema} from './helpers.js';

const statusSchema = z
    .enum(['INACTIVE', 'VISIBLE', 'INVISIBLE'])
    .describe('Status of the custom field');
const typeSchema = z
    .enum(['TXT', 'NUMBER', 'DROPDOWN_SINGLE', 'DROPDOWN_MULTIPLE', 'CHECKBOX', 'LINK'])
    .describe('Type of the custom field');
const customFieldIdSchema = z.string().describe('The ID of the custom field');
const projectIdSchema = z.string().describe('The ID of the project');
const entityTypeSchema = z
    .string()
    .optional()
    .describe('Filter custom fields by entity type (e.g. TIMEENTRY, USER)');
const valueSchema = z
    .unknown()
    .describe('Value of the custom field; its shape depends on the custom field type');

const customFieldBody = {
    name: z.string().describe('Name of the custom field'),
    allowedValues: z
        .array(z.string())
        .optional()
        .describe('Allowed values (for dropdown custom fields)'),
    description: z.string().optional().describe('Description of the custom field'),
    onlyAdminCanEdit: z.boolean().optional().describe('Whether only admins can edit the field'),
    placeholder: z.string().optional().describe('Placeholder text of the custom field'),
    workspaceDefaultValue: valueSchema.optional(),
};

export function registerCustomFieldTools(server: McpServer) {
    defineTool(server, {
        name: 'get_custom_fields',
        title: 'Get Custom Fields',
        description: 'Get custom fields on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter custom fields by name (contains)'),
            status: statusSchema.optional(),
            'entity-type': entityTypeSchema,
        },
        action: 'fetch custom fields',
        handler: async ({name, status, 'entity-type': entityType}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/custom-fields`, {
                query: {name, status, 'entity-type': entityType},
            }),
    });

    defineTool(server, {
        name: 'create_custom_field',
        title: 'Create Custom Field',
        description: 'Create a custom field on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            ...customFieldBody,
            type: typeSchema,
            entityType: z
                .enum(['TIMEENTRY', 'USER'])
                .optional()
                .describe('Entity the custom field applies to'),
            status: statusSchema.optional(),
        },
        action: 'create custom field',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/custom-fields`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_custom_field',
        title: 'Update Custom Field',
        description: 'Update a custom field on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            customFieldId: customFieldIdSchema,
            ...customFieldBody,
            type: typeSchema.optional(),
            required: z.boolean().optional().describe('Whether the custom field is required'),
            status: statusSchema.optional(),
        },
        action: 'update custom field',
        handler: async ({workspaceId: _, customFieldId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/custom-fields/${customFieldId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_custom_field',
        title: 'Delete Custom Field',
        description: 'Delete a custom field from a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, customFieldId: customFieldIdSchema},
        action: 'delete custom field',
        handler: async ({customFieldId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/custom-fields/${customFieldId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'get_project_custom_fields',
        title: 'Get Project Custom Fields',
        description: 'Get custom fields on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            status: statusSchema.optional(),
            'entity-type': entityTypeSchema,
        },
        action: 'fetch project custom fields',
        handler: async ({projectId, status, 'entity-type': entityType}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/custom-fields`,
                {
                    query: {status, 'entity-type': entityType},
                }
            ),
    });

    defineTool(server, {
        name: 'update_project_custom_field',
        title: 'Update Project Custom Field',
        description: 'Update the default value or status of a custom field on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            customFieldId: customFieldIdSchema,
            defaultValue: valueSchema.optional(),
            status: statusSchema.optional(),
        },
        action: 'update project custom field',
        handler: async ({projectId, customFieldId, defaultValue, status}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/custom-fields/${customFieldId}`,
                {method: 'PATCH', body: {defaultValue, status}}
            ),
    });

    defineTool(server, {
        name: 'remove_project_custom_field',
        title: 'Remove Project Custom Field',
        description: 'Remove a custom field from a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            customFieldId: customFieldIdSchema,
        },
        action: 'remove project custom field',
        handler: async ({projectId, customFieldId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/custom-fields/${customFieldId}`,
                {method: 'DELETE'}
            ),
    });

    defineTool(server, {
        name: 'set_user_custom_field_value',
        title: 'Set User Custom Field Value',
        description: "Update a user's custom field value",
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            customFieldId: customFieldIdSchema,
            value: valueSchema.optional(),
        },
        action: 'set user custom field value',
        handler: async ({customFieldId, value}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/users/${await userId()}/custom-field/${customFieldId}/value`,
                {method: 'PUT', body: {value}}
            ),
    });
}
