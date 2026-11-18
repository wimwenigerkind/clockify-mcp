import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, userIdSchema, workspaceIdSchema} from './helpers.js';

const assignmentIdSchema = z.string().describe('The ID of the assignment');
const seriesUpdateOptionSchema = z
    .enum(['THIS_ONE', 'THIS_AND_FOLLOWING', 'ALL'])
    .optional()
    .describe('Which assignments of the recurring series are affected');
const startSchema = z.string().describe('Start date (yyyy-MM-ddThh:mm:ssZ)');
const endSchema = z.string().describe('End date (yyyy-MM-ddThh:mm:ssZ)');
const statusFilterSchema = z
    .enum(['PUBLISHED', 'UNPUBLISHED', 'ALL'])
    .optional()
    .describe('Filter assignments by publish status');
const searchSchema = z.string().optional().describe('Search term');

const filterContains = z
    .enum(['CONTAINS', 'DOES_NOT_CONTAIN', 'CONTAINS_ONLY'])
    .optional()
    .describe('Whether the listed IDs are included, excluded or exclusive');
const filterStatus = z
    .enum(['PENDING', 'ACTIVE', 'DECLINED', 'INACTIVE', 'ALL'])
    .optional()
    .describe('Status filter');

const userFilterSchema = z
    .object({
        contains: filterContains,
        ids: z.array(z.string()).optional().describe('User IDs'),
        sourceType: z.enum(['USER_GROUP']).optional().describe('Source type of the IDs'),
        status: filterStatus,
        statuses: z.array(filterStatus.unwrap()).optional().describe('Status filters'),
    })
    .optional()
    .describe('Filter by users');

const userGroupFilterSchema = z
    .object({
        contains: filterContains,
        ids: z.array(z.string()).optional().describe('User group IDs'),
        status: filterStatus,
    })
    .optional()
    .describe('Filter by user groups');

const totalsBody = {
    start: z.string().describe('Start date-time (ISO 8601)'),
    end: z.string().describe('End date-time (ISO 8601)'),
    page: pageSchema.page,
    pageSize: z.number().int().min(1).optional().describe('Items per page'),
    search: searchSchema,
    statusFilter: statusFilterSchema,
};

const recurrenceSchema = {
    frequency: z.enum(['NONE', 'WEEKLY', 'MONTHLY']).optional().describe('Recurring frequency'),
    interval: z.number().int().optional().describe('Repeat every N frequency units'),
    monthlyRecurringType: z
        .enum(['FIXED_DAY', 'WEEK_POSITION'])
        .optional()
        .describe('Monthly recurring type'),
    occurrences: z.number().int().optional().describe('Number of occurrences'),
    recurringEndType: z
        .enum(['UNTIL_DATE', 'AFTER_OCCURRENCES'])
        .optional()
        .describe('How the recurrence ends'),
    repeat: z.boolean().optional().describe('Whether the assignment repeats'),
    until: z.string().optional().describe('End date-time of the recurrence (ISO 8601)'),
    weeks: z.number().int().optional().describe('Number of weeks'),
};

const assignmentDetails = {
    billable: z.boolean().optional().describe('Whether the assignment is billable'),
    includeNonWorkingDays: z.boolean().optional().describe('Whether non-working days are included'),
    note: z.string().optional().describe('Note of the assignment'),
    startTime: z.string().optional().describe('Start time of the assignment (HH:mm:ss)'),
    taskId: z.string().optional().describe('Task ID'),
};

export function registerSchedulingTools(server: McpServer) {
    defineTool(server, {
        name: 'get_all_assignments',
        title: 'Get All Assignments',
        description: 'Get all scheduled assignments in a period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter assignments by name'),
            start: startSchema,
            end: endSchema,
            'sort-column': z.enum(['PROJECT', 'USER', 'ID']).optional().describe('Sort column'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch assignments',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/scheduling/assignments/all`, {
                query,
            }),
    });

    defineTool(server, {
        name: 'get_scheduled_project_totals',
        title: 'Get Scheduled Project Totals',
        description: 'Get scheduled assignment totals per project in a period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            search: searchSchema.describe('Search term for projects and clients by name'),
            start: startSchema,
            end: endSchema,
            ...pageSchema,
        },
        action: 'fetch scheduled project totals',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/projects/totals`,
                {query}
            ),
    });

    defineTool(server, {
        name: 'get_filtered_scheduled_project_totals',
        title: 'Get Filtered Scheduled Project Totals',
        description: 'Get scheduled assignment totals per project in a period, filtered by status',
        inputSchema: {workspaceId: workspaceIdSchema, ...totalsBody},
        action: 'fetch filtered scheduled project totals',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/projects/totals`,
                {method: 'POST', body}
            ),
    });

    defineTool(server, {
        name: 'get_scheduled_totals_for_project',
        title: 'Get Scheduled Totals For Project',
        description: 'Get scheduled assignment totals for a single project in a period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: z.string().describe('The ID of the project'),
            start: startSchema,
            end: endSchema,
        },
        action: 'fetch scheduled totals for project',
        handler: async ({projectId, start, end}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/projects/totals/${projectId}`,
                {query: {start, end}}
            ),
    });

    defineTool(server, {
        name: 'get_scheduled_user_totals',
        title: 'Get Scheduled User Totals',
        description: "Get the total of users' scheduled capacity in a period, with user filters",
        inputSchema: {
            workspaceId: workspaceIdSchema,
            ...totalsBody,
            userFilter: userFilterSchema,
            userGroupFilter: userGroupFilterSchema,
        },
        action: 'fetch scheduled user totals',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/user-filter/totals`,
                {method: 'POST', body}
            ),
    });

    defineTool(server, {
        name: 'get_scheduled_totals_for_user',
        title: 'Get Scheduled Totals For User',
        description: 'Get the scheduled capacity of a single user in a period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            start: startSchema,
            end: endSchema,
            ...pageSchema,
        },
        action: 'fetch scheduled totals for user',
        handler: async ({start, end, page, 'page-size': pageSize}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/users/${await userId()}/totals`,
                {query: {start, end, page, 'page-size': pageSize}}
            ),
    });

    defineTool(server, {
        name: 'publish_assignments',
        title: 'Publish Assignments',
        description: 'Publish scheduled assignments in a period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            start: z.string().describe('Start date-time (ISO 8601)'),
            end: z.string().describe('End date-time (ISO 8601)'),
            notifyUsers: z.boolean().optional().describe('Whether users are notified'),
            search: searchSchema,
            userFilter: userFilterSchema,
            userGroupFilter: userGroupFilterSchema,
            viewType: z.enum(['PROJECTS', 'TEAM', 'ALL']).optional().describe('View type'),
        },
        action: 'publish assignments',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/scheduling/assignments/publish`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'create_assignment',
        title: 'Create Assignment',
        description: 'Create a scheduled assignment, optionally recurring',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: z.string().describe('ID of the assigned user'),
            projectId: z.string().describe('ID of the project'),
            start: z.string().describe('Start date-time (ISO 8601)'),
            end: z.string().describe('End date-time (ISO 8601)'),
            hoursPerDay: z.number().describe('Scheduled hours per day'),
            ...assignmentDetails,
            recurringAssignment: z
                .object(recurrenceSchema)
                .optional()
                .describe('Recurrence settings'),
        },
        action: 'create assignment',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/scheduling/assignments/recurring`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_assignment',
        title: 'Update Assignment',
        description: 'Update a scheduled assignment',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            assignmentId: assignmentIdSchema,
            start: z.string().describe('Start date-time (ISO 8601)'),
            end: z.string().describe('End date-time (ISO 8601)'),
            hoursPerDay: z.number().optional().describe('Scheduled hours per day'),
            ...assignmentDetails,
            seriesUpdateOption: seriesUpdateOptionSchema,
        },
        action: 'update assignment',
        handler: async ({workspaceId: _, assignmentId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/recurring/${assignmentId}`,
                {method: 'PATCH', body}
            ),
    });

    defineTool(server, {
        name: 'delete_assignment',
        title: 'Delete Assignment',
        description: 'Delete a scheduled assignment',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            assignmentId: assignmentIdSchema,
            seriesUpdateOption: seriesUpdateOptionSchema,
        },
        action: 'delete assignment',
        handler: async ({assignmentId, seriesUpdateOption}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/recurring/${assignmentId}`,
                {method: 'DELETE', query: {seriesUpdateOption}}
            ),
    });

    defineTool(server, {
        name: 'update_assignment_recurring_period',
        title: 'Update Assignment Recurring Period',
        description: 'Change the recurring period of an assignment series',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            assignmentId: assignmentIdSchema,
            ...recurrenceSchema,
        },
        action: 'update assignment recurring period',
        handler: async ({workspaceId: _, assignmentId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/series/${assignmentId}`,
                {method: 'PUT', body}
            ),
    });

    defineTool(server, {
        name: 'copy_assignment',
        title: 'Copy Assignment',
        description: 'Copy a scheduled assignment to a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            assignmentId: assignmentIdSchema,
            userId: z.string().describe('ID of the user receiving the copy'),
            seriesUpdateOption: seriesUpdateOptionSchema,
        },
        action: 'copy assignment',
        handler: async ({workspaceId: _, assignmentId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/scheduling/assignments/${assignmentId}/copy`,
                {method: 'POST', body}
            ),
    });
}
