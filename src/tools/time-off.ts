import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, userIdSchema, workspaceIdSchema} from './helpers.js';
import {
    automaticTimeEntryCreationSchema,
    userGroupsFilterSchema,
    usersFilterSchema,
} from './holiday.js';

const policyIdSchema = z.string().describe('The ID of the time off policy');
const requestIdSchema = z.string().describe('The ID of the time off request');
const timeViewModeSchema = z
    .enum(['TIME_SENSITIVE_VIEW', 'AGGREGATED_TIME_VIEW'])
    .optional()
    .describe('Time view mode used to display dates');
const sortOrderSchema = z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order');
const balanceSortSchema = z
    .enum(['USER', 'POLICY', 'USED', 'BALANCE', 'TOTAL'])
    .optional()
    .describe('Sort column');
const noteSchema = z.string().optional().describe('Note');
const dateRangeSchema = z
    .object({
        start: z.string().optional().describe('Start date'),
        end: z.string().optional().describe('End date'),
    })
    .optional()
    .describe('Date range of the balance');

const timeUnitPeriod = z.enum(['MONTH', 'YEAR']).describe('Accrual period');

const policyBody = {
    name: z.string().describe('Name of the policy'),
    allowHalfDay: z.boolean().optional().describe('Whether half days are allowed'),
    allowNegativeBalance: z.boolean().optional().describe('Whether a negative balance is allowed'),
    approve: z
        .object({
            requiresApproval: z.boolean().optional().describe('Whether requests need approval'),
            specificMembers: z.boolean().optional().describe('Whether specific members approve'),
            teamManagers: z.boolean().optional().describe('Whether team managers approve'),
            userIds: z.array(z.string()).optional().describe('IDs of approving users'),
        })
        .describe('Approval settings'),
    archived: z.boolean().optional().describe('Whether the policy is archived'),
    automaticAccrual: z
        .object({
            amount: z.number().describe('Accrued amount per period'),
            period: timeUnitPeriod.optional(),
        })
        .optional()
        .describe('Automatic accrual settings'),
    automaticTimeEntryCreation: automaticTimeEntryCreationSchema,
    color: z.string().optional().describe('Color of the policy (hex, e.g. #FF5722)'),
    everyoneIncludingNew: z
        .boolean()
        .optional()
        .describe('Whether the policy applies to everyone, including new members'),
    hasExpiration: z.boolean().optional().describe('Whether the balance expires'),
    icon: z
        .enum([
            'UMBRELLA',
            'SNOWFLAKE',
            'FAMILY',
            'PLANE',
            'STETHOSCOPE',
            'HEALTH_METRICS',
            'CHILDCARE',
            'LUGGAGE',
            'MONETIZATION',
            'CALENDAR',
        ])
        .optional()
        .describe('Icon of the policy'),
    negativeBalance: z
        .object({
            amount: z.number().describe('Maximum negative balance'),
            period: timeUnitPeriod.optional(),
            shouldReset: z.boolean().optional().describe('Whether the negative balance resets'),
        })
        .optional()
        .describe('Negative balance settings'),
    userGroups: userGroupsFilterSchema,
    users: usersFilterSchema,
};

const requestBody = {
    note: noteSchema,
    timeOffPeriod: z
        .object({
            period: z
                .object({
                    days: z.number().int().min(1).max(999).optional().describe('Number of days'),
                    start: z.string().optional().describe('Start date (yyyy-MM-dd)'),
                    end: z.string().optional().describe('End date (yyyy-MM-dd)'),
                })
                .describe('Period of the time off'),
            isHalfDay: z.boolean().optional().describe('Whether the time off is a half day'),
            halfDayPeriod: z
                .enum(['FIRST_HALF', 'SECOND_HALF', 'NOT_DEFINED'])
                .optional()
                .describe('Which half of the day'),
        })
        .describe('Time off period'),
    timeViewMode: timeViewModeSchema,
};

export function registerTimeOffTools(server: McpServer) {
    defineTool(server, {
        name: 'get_time_off_policies',
        title: 'Get Time Off Policies',
        description: 'Get time off policies on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            name: z.string().optional().describe('Filter policies by name (contains)'),
            status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).optional().describe('Policy status'),
            'sort-column': z.string().optional().describe('Sort column'),
            'sort-order': z.string().optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch time off policies',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies`, {query}),
    });

    defineTool(server, {
        name: 'get_time_off_policy',
        title: 'Get Time Off Policy',
        description: 'Get a time off policy by ID',
        inputSchema: {workspaceId: workspaceIdSchema, policyId: policyIdSchema},
        action: 'fetch time off policy',
        handler: async ({policyId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies/${policyId}`),
    });

    defineTool(server, {
        name: 'create_time_off_policy',
        title: 'Create Time Off Policy',
        description: 'Create a time off policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            ...policyBody,
            timeUnit: z.enum(['DAYS', 'HOURS']).optional().describe('Time unit of the policy'),
        },
        action: 'create time off policy',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_time_off_policy',
        title: 'Update Time Off Policy',
        description: 'Update a time off policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            ...policyBody,
            allowHalfDay: z.boolean().describe('Whether half days are allowed'),
            allowNegativeBalance: z.boolean().describe('Whether a negative balance is allowed'),
            archived: z.boolean().describe('Whether the policy is archived'),
            everyoneIncludingNew: z
                .boolean()
                .describe('Whether the policy applies to everyone, including new members'),
            hasExpiration: z.boolean().describe('Whether the balance expires'),
            toilSyncMethod: z.string().optional().describe('TOIL sync method'),
        },
        action: 'update time off policy',
        handler: async ({workspaceId: _, policyId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies/${policyId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_time_off_policy_status',
        title: 'Update Time Off Policy Status',
        description: 'Change the status of a time off policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).describe('New status of the policy'),
        },
        action: 'update time off policy status',
        handler: async ({policyId, status}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies/${policyId}`, {
                method: 'PATCH',
                body: {status},
            }),
    });

    defineTool(server, {
        name: 'delete_time_off_policy',
        title: 'Delete Time Off Policy',
        description: 'Delete a time off policy',
        inputSchema: {workspaceId: workspaceIdSchema, policyId: policyIdSchema},
        action: 'delete time off policy',
        handler: async ({policyId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/policies/${policyId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'get_time_off_requests',
        title: 'Get Time Off Requests',
        description: 'Get time off requests on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            start: z.string().optional().describe('Start date-time (ISO 8601)'),
            end: z.string().optional().describe('End date-time (ISO 8601)'),
            page: pageSchema.page,
            pageSize: z.number().int().min(1).optional().describe('Items per page'),
            statuses: z
                .array(z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']))
                .optional()
                .describe('Filter by request statuses'),
            userGroups: z.array(z.string()).optional().describe('Filter by user group IDs'),
            users: z.array(z.string()).optional().describe('Filter by user IDs'),
        },
        action: 'fetch time off requests',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/requests`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'create_time_off_request',
        title: 'Create Time Off Request',
        description: 'Create a time off request for the authenticated user',
        inputSchema: {workspaceId: workspaceIdSchema, policyId: policyIdSchema, ...requestBody},
        action: 'create time off request',
        handler: async ({workspaceId: _, policyId, timeViewMode, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/policies/${policyId}/requests`,
                {method: 'POST', query: {timeViewMode}, body}
            ),
    });

    defineTool(server, {
        name: 'create_time_off_request_for_user',
        title: 'Create Time Off Request For User',
        description: 'Create a time off request on behalf of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            policyId: policyIdSchema,
            ...requestBody,
        },
        action: 'create time off request for user',
        handler: async (
            {workspaceId: _w, userId: _u, policyId, timeViewMode, ...body},
            {workspaceId, userId}
        ) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/policies/${policyId}/users/${await userId()}/requests`,
                {method: 'POST', query: {timeViewMode}, body}
            ),
    });

    defineTool(server, {
        name: 'change_time_off_request_status',
        title: 'Change Time Off Request Status',
        description: 'Approve or reject a time off request',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            requestId: requestIdSchema,
            status: z.enum(['APPROVED', 'REJECTED']).describe('New status of the request'),
            note: noteSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'change time off request status',
        handler: async ({policyId, requestId, status, note, timeViewMode}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/policies/${policyId}/requests/${requestId}`,
                {method: 'PATCH', query: {timeViewMode}, body: {status, note}}
            ),
    });

    defineTool(server, {
        name: 'delete_time_off_request',
        title: 'Delete Time Off Request',
        description: 'Delete a time off request',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            requestId: requestIdSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'delete time off request',
        handler: async ({policyId, requestId, timeViewMode}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/policies/${policyId}/requests/${requestId}`,
                {method: 'DELETE', query: {timeViewMode}}
            ),
    });

    defineTool(server, {
        name: 'get_time_off_balances_for_user',
        title: 'Get Time Off Balances For User',
        description: 'Get time off balances of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            sort: balanceSortSchema,
            'sort-order': sortOrderSchema,
            ...pageSchema,
        },
        action: 'fetch time off balances for user',
        handler: async ({workspaceId: _w, userId: _u, ...query}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/user/${await userId()}`,
                {
                    query,
                }
            ),
    });

    defineTool(server, {
        name: 'get_time_off_balances_for_policy',
        title: 'Get Time Off Balances For Policy',
        description: 'Get time off balances for a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            sort: balanceSortSchema,
            'sort-order': sortOrderSchema,
            ...pageSchema,
        },
        action: 'fetch time off balances for policy',
        handler: async ({workspaceId: _, policyId, ...query}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/policy/${policyId}`,
                {
                    query,
                }
            ),
    });

    defineTool(server, {
        name: 'update_time_off_balance',
        title: 'Update Time Off Balance',
        description: 'Update time off balances of users in a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            userIds: z.array(z.string()).describe('IDs of the users whose balance is updated'),
            value: z.number().describe('New balance value'),
            dateRange: dateRangeSchema,
            note: noteSchema,
            sync: z.boolean().optional().describe('Whether to sync the balance'),
        },
        action: 'update time off balance',
        handler: async ({workspaceId: _, policyId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/policy/${policyId}`,
                {
                    method: 'PATCH',
                    body,
                }
            ),
    });

    defineTool(server, {
        name: 'create_time_off_balance_assignment',
        title: 'Create Time Off Balance Assignment',
        description: 'Create a balance assignment for users in a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            policyId: policyIdSchema,
            userIds: z.array(z.string()).describe('IDs of the users receiving the balance'),
            balance: z.number().describe('Assigned balance'),
            dateRange: dateRangeSchema,
            note: noteSchema,
        },
        action: 'create time off balance assignment',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-off/balance/assignment`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'get_time_off_balance_assignments',
        title: 'Get Time Off Balance Assignments',
        description: 'Get all balance assignments of a user in a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            policyId: policyIdSchema,
        },
        action: 'fetch time off balance assignments',
        handler: async ({policyId}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/assignment/user/${await userId()}/policy/${policyId}`
            ),
    });

    defineTool(server, {
        name: 'update_time_off_balance_assignment',
        title: 'Update Time Off Balance Assignment',
        description: 'Update a balance assignment of a user in a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            policyId: policyIdSchema,
            balanceAssignmentId: z.string().describe('The ID of the balance assignment'),
            balanceChange: z.number().describe('Change of the balance'),
            dateRange: dateRangeSchema,
            note: noteSchema,
        },
        action: 'update time off balance assignment',
        handler: async (
            {workspaceId: _w, userId: _u, policyId, balanceAssignmentId, ...body},
            {workspaceId, userId}
        ) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/assignment/${balanceAssignmentId}/user/${await userId()}/policy/${policyId}`,
                {method: 'PUT', body}
            ),
    });

    defineTool(server, {
        name: 'delete_time_off_balance_assignment',
        title: 'Delete Time Off Balance Assignment',
        description: 'Delete a balance assignment of a user in a policy',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            policyId: policyIdSchema,
            balanceAssignmentId: z.string().describe('The ID of the balance assignment'),
            note: z.string().describe('Reason for deleting the assignment'),
        },
        action: 'delete time off balance assignment',
        handler: async ({policyId, balanceAssignmentId, note}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/time-off/balance/assignment/${balanceAssignmentId}/user/${await userId()}/policy/${policyId}`,
                {method: 'DELETE', body: {note}}
            ),
    });
}
