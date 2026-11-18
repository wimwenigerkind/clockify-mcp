import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, rateSchema, workspaceIdSchema} from './helpers.js';

const projectIdSchema = z.string().describe('The ID of the project');

const rateAmountSchema = z
    .object({
        amount: z.number().int().min(0).describe('Rate amount in cents'),
        currency: z.string().optional().describe('Currency code'),
    })
    .describe('Rate');

const membershipSchema = z.object({
    userId: z.string().describe('ID of the user'),
    hourlyRate: rateAmountSchema.optional().describe('Hourly rate of the user on the project'),
    costRate: rateAmountSchema.optional().describe('Cost rate of the user on the project'),
    membershipType: z.string().optional().describe('Membership type, e.g. PROJECT'),
    membershipStatus: z.string().optional().describe('Membership status, e.g. ACTIVE'),
});

const estimateFields = {
    estimateType: z.enum(['AUTO', 'MANUAL']).optional().describe('Estimate type'),
    estimate: z.string().optional().describe('Time estimate as ISO 8601 duration, e.g. PT10H'),
    active: z.boolean().optional().describe('Whether the estimate is active'),
    resetOption: z
        .enum(['WEEKLY', 'MONTHLY', 'YEARLY'])
        .nullable()
        .optional()
        .describe('Reset option of the estimate'),
    includeExpenses: z
        .boolean()
        .optional()
        .describe('Whether expenses are included in the budget estimate'),
};

const projectFields = {
    clientId: z.string().optional().describe('ID of the client'),
    isPublic: z.boolean().optional().describe('Whether the project is public'),
    color: z.string().optional().describe('Color in hex format, e.g. #FF0000'),
    note: z.string().optional().describe('Note of the project'),
    billable: z.boolean().optional().describe('Whether the project is billable'),
    hourlyRate: rateAmountSchema.optional().describe('Hourly rate of the project'),
    costRate: rateAmountSchema.optional().describe('Cost rate of the project'),
    memberships: z.array(membershipSchema).optional().describe('Project memberships'),
    estimate: z.object(estimateFields).optional().describe('Time estimate of the project'),
    budgetEstimate: z.object(estimateFields).optional().describe('Budget estimate of the project'),
};

const userListFilter = {
    users: z.array(z.string()).optional().describe('Filter by user IDs'),
    'contains-user': z
        .enum(['CONTAINS', 'DOES_NOT_CONTAIN'])
        .optional()
        .describe('Whether projects must contain the given users'),
    'user-status': z
        .enum(['PENDING', 'ACTIVE', 'DECLINED', 'INACTIVE', 'ALL'])
        .optional()
        .describe('Status of the users in the filter'),
};

export function registerProjectTools(server: McpServer) {
    defineTool(server, {
        name: 'get_projects_on_workspace',
        title: 'Get Projects on Workspace',
        description: 'Get all projects on a workspace (defaults to active workspace)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter projects by name (partial match)'),
            'strict-name-search': z
                .boolean()
                .optional()
                .describe('Only return projects whose name exactly matches the name filter'),
            archived: z.boolean().optional().describe('Filter by archived status'),
            billable: z.boolean().optional().describe('Filter by billable status'),
            clients: z.array(z.string()).optional().describe('Filter by client IDs'),
            'contains-client': z
                .boolean()
                .optional()
                .describe('Whether projects must belong to the given clients'),
            'client-status': z
                .enum(['ACTIVE', 'ARCHIVED'])
                .optional()
                .describe('Filter by client status'),
            ...userListFilter,
            'is-template': z.boolean().optional().describe('Filter by template status'),
            'sort-column': z
                .enum(['ID', 'NAME', 'CLIENT_NAME', 'DURATION', 'BUDGET', 'PROGRESS'])
                .optional()
                .describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            hydrated: z.boolean().optional().describe('Include hydrated data (e.g. tasks, client)'),
            access: z.enum(['PUBLIC', 'PRIVATE']).optional().describe('Filter by project access'),
            'expense-limit': z.number().int().optional().describe('Limit of expenses to include'),
            'expense-date': z.string().optional().describe('Date (YYYY-MM-DD) for expense totals'),
            ...pageSchema,
        },
        action: 'fetch projects on workspace',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects`, {query}),
    });

    defineTool(server, {
        name: 'get_project',
        title: 'Get Project',
        description: 'Get a project by ID',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            hydrated: z.boolean().optional().describe('Include hydrated data'),
            'custom-field-entity-type': z
                .string()
                .optional()
                .describe('Entity type of custom fields to include'),
        },
        action: 'fetch project',
        handler: async (
            {projectId, hydrated, 'custom-field-entity-type': entityType},
            {workspaceId}
        ) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}`, {
                query: {hydrated, 'custom-field-entity-type': entityType},
            }),
    });

    defineTool(server, {
        name: 'add_project',
        title: 'Add Project',
        description: 'Create a new project on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the project'),
            ...projectFields,
            tasks: z
                .array(
                    z.object({
                        name: z.string().describe('Name of the task'),
                        assigneeIds: z.array(z.string()).optional().describe('Assignee user IDs'),
                        status: z.enum(['ACTIVE', 'DONE']).optional().describe('Task status'),
                    })
                )
                .optional()
                .describe('Tasks to create with the project'),
            isTemplate: z.boolean().optional().describe('Whether the project is a template'),
        },
        action: 'add project',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_project',
        title: 'Update Project',
        description: 'Update a project, including archiving or unarchiving it',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            name: z.string().optional().describe('New name of the project'),
            archived: z.boolean().optional().describe('Whether the project is archived'),
            ...projectFields,
            'mark-tasks-as-done': z
                .boolean()
                .optional()
                .describe('Mark all tasks as done when archiving the project'),
        },
        action: 'update project',
        handler: async (
            {workspaceId: _, projectId, 'mark-tasks-as-done': markTasksAsDone, ...body},
            {workspaceId}
        ) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}`, {
                method: 'PUT',
                query: {'mark-tasks-as-done': markTasksAsDone},
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_project',
        title: 'Delete Project',
        description: 'Delete a project (the project must be archived first)',
        inputSchema: {workspaceId: workspaceIdSchema, projectId: projectIdSchema},
        action: 'delete project',
        handler: async ({projectId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'update_project_memberships',
        title: 'Update Project Memberships',
        description: 'Replace the user and user group memberships of a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            memberships: z
                .array(
                    z.object({
                        userId: z.string().describe('ID of the user'),
                        hourlyRate: rateAmountSchema.optional().describe('Hourly rate'),
                        costRate: rateAmountSchema.optional().describe('Cost rate'),
                    })
                )
                .optional()
                .describe('User memberships'),
            userGroups: z.array(z.string()).optional().describe('IDs of user groups to assign'),
        },
        action: 'update project memberships',
        handler: async ({projectId, memberships, userGroups}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/memberships`,
                {method: 'PATCH', body: {memberships, userGroups}}
            ),
    });

    defineTool(server, {
        name: 'assign_project_users',
        title: 'Assign Project Users',
        description: 'Add users or user groups to a project, or remove them from it',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            userIds: z.array(z.string()).optional().describe('IDs of the users to add or remove'),
            userGroupIds: z
                .array(z.string())
                .optional()
                .describe('IDs of the user groups to add or remove'),
            remove: z.boolean().optional().describe('Remove instead of adding'),
        },
        action: 'assign project users',
        handler: async ({projectId, userIds, userGroupIds, remove}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/memberships`,
                {
                    method: 'POST',
                    body: {
                        userIds,
                        remove,
                        userGroups: userGroupIds && {userGroupIds},
                    },
                }
            ),
    });

    defineTool(server, {
        name: 'update_project_user_hourly_rate',
        title: 'Update Project User Hourly Rate',
        description: 'Update the hourly (billable) rate of a user on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            userId: z.string().describe('The ID of the user'),
            ...rateSchema,
        },
        action: 'update project user hourly rate',
        handler: async ({projectId, userId, amount, since}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/users/${userId}/hourly-rate`,
                {method: 'PUT', body: {amount, since}}
            ),
    });

    defineTool(server, {
        name: 'update_project_user_cost_rate',
        title: 'Update Project User Cost Rate',
        description: 'Update the cost rate of a user on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            userId: z.string().describe('The ID of the user'),
            ...rateSchema,
        },
        action: 'update project user cost rate',
        handler: async ({projectId, userId, amount, since}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/users/${userId}/cost-rate`,
                {method: 'PUT', body: {amount, since}}
            ),
    });

    defineTool(server, {
        name: 'add_project_from_template',
        title: 'Add Project From Template',
        description: 'Create a new project from a project template',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().describe('Name of the new project'),
            templateProjectId: z.string().describe('ID of the template project'),
            clientId: z.string().optional().describe('ID of the client'),
            color: z.string().optional().describe('Color in hex format, e.g. #FF0000'),
            isPublic: z.boolean().optional().describe('Whether the project is public'),
        },
        action: 'add project from template',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/from-template`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_project_template',
        title: 'Update Project Template',
        description: 'Mark a project as template or remove the template flag',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            isTemplate: z.boolean().describe('Whether the project is a template'),
        },
        action: 'update project template',
        handler: async ({projectId, isTemplate}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}/template`, {
                method: 'PATCH',
                body: {isTemplate},
            }),
    });

    defineTool(server, {
        name: 'update_project_estimate',
        title: 'Update Project Estimate',
        description: 'Update the time and budget estimate of a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            timeEstimate: z.object(estimateFields).optional().describe('Time estimate'),
            budgetEstimate: z.object(estimateFields).optional().describe('Budget estimate'),
        },
        action: 'update project estimate',
        handler: async ({projectId, timeEstimate, budgetEstimate}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}/estimate`, {
                method: 'PATCH',
                body: {timeEstimate, budgetEstimate},
            }),
    });
}
