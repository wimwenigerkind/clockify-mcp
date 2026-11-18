import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, userIdSchema, workspaceIdSchema} from './helpers.js';

const timeViewModeSchema = z
    .string()
    .optional()
    .describe('Time view mode, e.g. TIME_SENSITIVE_VIEW (default) or TIME_INSENSITIVE_VIEW');

const periodSchema = z
    .enum(['WEEKLY', 'SEMI_MONTHLY', 'MONTHLY'])
    .optional()
    .describe('Approval period type');

const periodStartSchema = z.string().describe('Start of the approval period (ISO 8601 date-time)');

const submitTypeSchema = z.enum(['TIMESHEET', 'EXPENSE']).describe('Type of the entries');

export function registerApprovalTools(server: McpServer) {
    defineTool(server, {
        name: 'get_approval_requests',
        title: 'Get Approval Requests',
        description: 'Get approval requests of a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            status: z
                .enum(['PENDING', 'APPROVED', 'WITHDRAWN_APPROVAL'])
                .optional()
                .describe('Filter by approval status'),
            types: z
                .enum(['TIMESHEET', 'EXPENSE', 'TIMESHEET_AND_EXPENSE'])
                .optional()
                .describe('Filter by request type'),
            'sort-column': z
                .enum(['ID', 'USER_ID', 'START', 'UPDATED_AT'])
                .optional()
                .describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch approval requests',
        handler: async ({workspaceId: _, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/approval-requests`, {query}),
    });

    defineTool(server, {
        name: 'submit_approval_request',
        title: 'Submit Approval Request',
        description: 'Submit a timesheet or expenses for approval for the authenticated user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            type: submitTypeSchema,
            period: periodSchema,
            periodStart: periodStartSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'submit approval request',
        handler: async ({type, period, periodStart, timeViewMode}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/approval-requests/${type}`, {
                method: 'POST',
                query: {timeViewMode},
                body: {period, periodStart},
            }),
    });

    defineTool(server, {
        name: 'submit_approval_request_for_user',
        title: 'Submit Approval Request For User',
        description: 'Submit a timesheet and/or expenses for approval on behalf of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            type: z
                .enum(['TIMESHEET', 'EXPENSE', 'TIMESHEET_AND_EXPENSE'])
                .describe('Type of the entries'),
            period: periodSchema,
            periodStart: periodStartSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'submit approval request for user',
        handler: async ({type, period, periodStart, timeViewMode}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/approval-requests/users/${await userId()}/${type}`,
                {method: 'POST', query: {timeViewMode}, body: {period, periodStart}}
            ),
    });

    defineTool(server, {
        name: 'resubmit_entries_for_approval',
        title: 'Resubmit Entries For Approval',
        description: 'Resubmit rejected entries for approval for the authenticated user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            type: submitTypeSchema.optional(),
            period: periodSchema,
            periodStart: periodStartSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'resubmit entries for approval',
        handler: async ({type, period, periodStart, timeViewMode}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/approval-requests/resubmit-entries-for-approval`,
                {method: 'POST', query: {timeViewMode}, body: {type, period, periodStart}}
            ),
    });

    defineTool(server, {
        name: 'resubmit_entries_for_approval_for_user',
        title: 'Resubmit Entries For Approval For User',
        description: 'Resubmit rejected entries for approval on behalf of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            type: submitTypeSchema.optional(),
            period: periodSchema,
            periodStart: periodStartSchema,
            timeViewMode: timeViewModeSchema,
        },
        action: 'resubmit entries for approval for user',
        handler: async ({type, period, periodStart, timeViewMode}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/approval-requests/users/${await userId()}/resubmit-entries-for-approval`,
                {method: 'POST', query: {timeViewMode}, body: {type, period, periodStart}}
            ),
    });

    defineTool(server, {
        name: 'update_approval_request',
        title: 'Update Approval Request',
        description: 'Approve, reject or withdraw an approval request',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            approvalRequestId: z.string().describe('The ID of the approval request'),
            state: z
                .enum([
                    'PENDING',
                    'APPROVED',
                    'WITHDRAWN_SUBMISSION',
                    'WITHDRAWN_APPROVAL',
                    'REJECTED',
                ])
                .describe('New state of the approval request'),
            note: z.string().optional().describe('Optional note, e.g. a rejection reason'),
        },
        action: 'update approval request',
        handler: async ({approvalRequestId, state, note}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/approval-requests/${approvalRequestId}`,
                {method: 'PATCH', body: {state, note}}
            ),
    });
}
