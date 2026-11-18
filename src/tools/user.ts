import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, rateSchema, userIdSchema, workspaceIdSchema} from './helpers.js';
import {roleSchema} from './workspace.js';

const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DECLINED', 'INACTIVE', 'ALL']);
const membershipsSchema = z.enum(['ALL', 'NONE', 'WORKSPACE', 'PROJECT', 'USERGROUP']);
const userSortColumnSchema = z.enum([
    'ID',
    'EMAIL',
    'NAME',
    'NAME_LOWERCASE',
    'ACCESS',
    'HOURLYRATE',
    'COSTRATE',
]);
const sortOrderSchema = z.enum(['ASCENDING', 'DESCENDING']);
const weekdaySchema = z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
]);
const customFieldValueSchema = z.unknown().describe('Value of the custom field');
const userCustomFieldsSchema = z
    .array(
        z.object({
            customFieldId: z.string().describe('The ID of the custom field'),
            value: customFieldValueSchema,
        })
    )
    .optional()
    .describe('Custom field values of the user');
const workCapacitySchema = z.string().optional().describe('Work capacity as ISO-8601 duration');
const workingDaysSchema = z.array(weekdaySchema).optional().describe('Working days of the user');
const weekStartSchema = weekdaySchema.optional().describe('First day of the week');
const roleBodySchema = {
    entityId: z
        .string()
        .describe('ID of the entity (workspace, project or user group) for the role'),
    role: roleSchema
        .exclude(['OWNER'])
        .describe('Role to assign or remove (WORKSPACE_ADMIN, TEAM_MANAGER, PROJECT_MANAGER)'),
    sourceType: z.literal('USER_GROUP').optional().describe('Source type of the role entity'),
};

export function registerUserTools(server: McpServer) {
    defineTool(server, {
        name: 'get_current_user',
        title: 'Get Current User',
        description: 'Get information about the currently authenticated Clockify user',
        inputSchema: {
            'include-memberships': z
                .boolean()
                .optional()
                .describe('Include the memberships of the user'),
        },
        action: 'fetch current user',
        handler: (query) => clockifyRequest('/user', {query}),
    });

    defineTool(server, {
        name: 'get_workspace_users',
        title: 'Get Workspace Users',
        description: 'Find all users in a workspace (defaults to active workspace)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            email: z.string().optional().describe('Filter users by email'),
            name: z.string().optional().describe('Filter users by name'),
            'project-id': z.string().optional().describe('Only users with access to this project'),
            status: userStatusSchema.optional().describe('Filter users by status'),
            'account-statuses': z.string().optional().describe('Filter users by account status'),
            'sort-column': userSortColumnSchema.optional().describe('Column used for sorting'),
            'sort-order': sortOrderSchema.optional().describe('Sort order'),
            memberships: membershipsSchema
                .optional()
                .describe('Include workspace, group or project memberships'),
            'include-roles': z.boolean().optional().describe('Include detailed manager roles'),
            ...pageSchema,
        },
        action: 'fetch workspace users',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users`, {query}),
    });

    defineTool(server, {
        name: 'filter_workspace_users',
        title: 'Filter Workspace Users',
        description: 'Filter workspace users with an extended set of criteria (roles, groups)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            accountStatuses: z.array(z.string()).optional().describe('Account statuses to match'),
            email: z.string().optional().describe('Filter users by email'),
            includeRoles: z.boolean().optional().describe('Include detailed manager roles'),
            memberships: membershipsSchema
                .optional()
                .describe('Include workspace, group or project memberships'),
            name: z.string().optional().describe('Filter users by name'),
            page: z.number().int().min(1).optional().describe('Page number'),
            pageSize: z.number().int().min(1).optional().describe('Items per page'),
            projectId: z.string().optional().describe('Only users with access to this project'),
            roles: z.array(roleSchema).optional().describe('Only users with one of these roles'),
            sortColumn: userSortColumnSchema.optional().describe('Column used for sorting'),
            sortOrder: sortOrderSchema.optional().describe('Sort order'),
            status: userStatusSchema.optional().describe('Filter users by status'),
            userGroups: z.array(z.string()).optional().describe('IDs of user groups to match'),
        },
        action: 'filter workspace users',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/info`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'add_workspace_user',
        title: 'Add Workspace User',
        description: 'Add (invite) a user to a workspace by email',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            email: z.string().describe('Email address of the user to add'),
            'send-email': z
                .boolean()
                .optional()
                .describe('Whether to send an invitation email (default true)'),
        },
        action: 'add workspace user',
        handler: async ({email, 'send-email': sendEmail}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users`, {
                method: 'POST',
                query: {'send-email': sendEmail ?? true},
                body: {email},
            }),
    });

    defineTool(server, {
        name: 'add_limited_users',
        title: 'Add Limited Users',
        description: 'Add limited users (users without an account) to a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            users: z
                .array(
                    z.object({
                        name: z.string().describe('Name of the limited user'),
                        costRate: z.number().int().optional().describe('Cost rate in cents'),
                        hourlyRate: z.number().int().optional().describe('Hourly rate in cents'),
                        userCustomFields: userCustomFieldsSchema,
                        userGroups: z.array(z.string()).optional().describe('User group IDs'),
                        weekStart: weekStartSchema,
                        workCapacity: workCapacitySchema,
                        workingDays: workingDaysSchema,
                    })
                )
                .describe('Limited users to add'),
        },
        action: 'add limited users',
        handler: async ({users}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/limited-users`, {
                method: 'POST',
                body: {users},
            }),
    });

    defineTool(server, {
        name: 'update_user_status',
        title: 'Update User Status',
        description: 'Activate or deactivate a user in a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            status: z.enum(['ACTIVE', 'INACTIVE']).describe('New status of the user'),
        },
        action: 'update user status',
        handler: async ({status}, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/${await userId()}`, {
                method: 'PUT',
                body: {status},
            }),
    });

    defineTool(server, {
        name: 'remove_workspace_user',
        title: 'Remove Workspace User',
        description: 'Remove a user from a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, userId: z.string().describe('User ID')},
        action: 'remove workspace user',
        handler: async ({userId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/${userId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'update_user_cost_rate',
        title: 'Update User Cost Rate',
        description: "Update a user's cost rate",
        inputSchema: {workspaceId: workspaceIdSchema, userId: userIdSchema, ...rateSchema},
        action: 'update user cost rate',
        handler: async ({amount, since}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/users/${await userId()}/cost-rate`,
                {
                    method: 'PUT',
                    body: {amount, since},
                }
            ),
    });

    defineTool(server, {
        name: 'update_user_hourly_rate',
        title: 'Update User Hourly Rate',
        description: "Update a user's billable (hourly) rate",
        inputSchema: {workspaceId: workspaceIdSchema, userId: userIdSchema, ...rateSchema},
        action: 'update user hourly rate',
        handler: async ({amount, since}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/users/${await userId()}/hourly-rate`,
                {method: 'PUT', body: {amount, since}}
            ),
    });

    defineTool(server, {
        name: 'update_user_custom_field_value',
        title: 'Update User Custom Field Value',
        description: "Update the value of a user's custom field",
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            customFieldId: z.string().describe('The ID of the custom field'),
            value: customFieldValueSchema,
        },
        action: 'update user custom field value',
        handler: async ({customFieldId, value}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/users/${await userId()}/custom-field/${customFieldId}/value`,
                {method: 'PUT', body: {value}}
            ),
    });

    defineTool(server, {
        name: 'get_user_managers',
        title: 'Get User Managers',
        description: "Find a user's team managers",
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            'sort-column': userSortColumnSchema.optional().describe('Column used for sorting'),
            'sort-order': sortOrderSchema.optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch user managers',
        handler: async ({workspaceId: _w, userId: _u, ...query}, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/${await userId()}/managers`, {
                query,
            }),
    });

    defineTool(server, {
        name: 'add_user_role',
        title: 'Add User Role',
        description: 'Give a manager/admin role to a user',
        inputSchema: {workspaceId: workspaceIdSchema, userId: userIdSchema, ...roleBodySchema},
        action: 'add user role',
        handler: async ({entityId, role, sourceType}, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/${await userId()}/roles`, {
                method: 'POST',
                body: {entityId, role, sourceType},
            }),
    });

    defineTool(server, {
        name: 'remove_user_role',
        title: 'Remove User Role',
        description: "Remove a user's manager/admin role",
        inputSchema: {workspaceId: workspaceIdSchema, userId: userIdSchema, ...roleBodySchema},
        action: 'remove user role',
        handler: async ({entityId, role, sourceType}, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/users/${await userId()}/roles`, {
                method: 'DELETE',
                body: {entityId, role, sourceType},
            }),
    });

    defineTool(server, {
        name: 'get_user_profile',
        title: 'Get User Profile',
        description: "Get a member's profile (defaults to the authenticated user)",
        inputSchema: {workspaceId: workspaceIdSchema, userId: userIdSchema},
        action: 'fetch user profile',
        handler: async (_, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/member-profile/${await userId()}`),
    });

    defineTool(server, {
        name: 'update_user_profile',
        title: 'Update User Profile',
        description: "Update a member's profile (defaults to the authenticated user)",
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            name: z.string().optional().describe('New name'),
            imageUrl: z.string().optional().describe('URL of the profile image'),
            removeProfileImage: z.boolean().optional().describe('Remove the profile image'),
            userCustomFields: userCustomFieldsSchema,
            weekStart: weekStartSchema,
            workCapacity: workCapacitySchema,
            workingDays: workingDaysSchema,
        },
        action: 'update user profile',
        handler: async ({workspaceId: _w, userId: _u, ...body}, {workspaceId, userId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/member-profile/${await userId()}`, {
                method: 'PATCH',
                body,
            }),
    });
}
