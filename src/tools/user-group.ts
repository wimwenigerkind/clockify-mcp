import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const userGroupIdSchema = z.string().describe('The ID of the user group');

export function registerUserGroupTools(server: McpServer) {
    defineTool(server, {
        name: 'get_user_groups',
        title: 'Get User Groups',
        description: 'Find all user groups on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            'project-id': z.string().optional().describe('Filter groups by project ID'),
            name: z.string().optional().describe('Filter groups by name'),
            'sort-column': z.enum(['ID', 'NAME']).optional().describe('Column used for sorting'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            includeTeamManagers: z
                .boolean()
                .optional()
                .describe('Include team managers assigned to the user groups'),
            ...pageSchema,
        },
        action: 'fetch user groups',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/user-groups`, {query}),
    });

    defineTool(server, {
        name: 'add_user_group',
        title: 'Add User Group',
        description: 'Create a new user group',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the user group'),
        },
        action: 'add user group',
        handler: async ({name}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/user-groups`, {
                method: 'POST',
                body: {name},
            }),
    });

    defineTool(server, {
        name: 'update_user_group',
        title: 'Update User Group',
        description: 'Update (rename) a user group',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userGroupId: userGroupIdSchema,
            name: z.string().describe('New name of the user group'),
        },
        action: 'update user group',
        handler: async ({userGroupId, name}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/user-groups/${userGroupId}`, {
                method: 'PUT',
                body: {name},
            }),
    });

    defineTool(server, {
        name: 'delete_user_group',
        title: 'Delete User Group',
        description: 'Delete a user group',
        inputSchema: {workspaceId: workspaceIdSchema, userGroupId: userGroupIdSchema},
        action: 'delete user group',
        handler: async ({userGroupId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/user-groups/${userGroupId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'add_user_to_user_group',
        title: 'Add User To User Group',
        description: 'Add a user to a user group',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userGroupId: userGroupIdSchema,
            userId: z.string().describe('The ID of the user to add'),
        },
        action: 'add user to user group',
        handler: async ({userGroupId, userId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/user-groups/${userGroupId}/users`, {
                method: 'POST',
                body: {userId},
            }),
    });

    defineTool(server, {
        name: 'remove_user_from_user_group',
        title: 'Remove User From User Group',
        description: 'Remove a user from a user group',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userGroupId: userGroupIdSchema,
            userId: z.string().describe('The ID of the user to remove'),
        },
        action: 'remove user from user group',
        handler: async ({userGroupId, userId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user-groups/${userGroupId}/users/${userId}`,
                {method: 'DELETE'}
            ),
    });
}
