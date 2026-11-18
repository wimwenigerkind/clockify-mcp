import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, userIdSchema, workspaceIdSchema} from './helpers.js';

const timeEntryTypeSchema = z.enum(['REGULAR', 'BREAK']).describe('Time entry type');
const timeViewModeSchema = z
    .enum(['TIME_SENSITIVE_VIEW', 'AGGREGATED_TIME_VIEW'])
    .optional()
    .describe('Time view mode');
const hydratedSchema = z
    .boolean()
    .optional()
    .describe('Include additional information (project, task, tags) in the response');

const customFieldsSchema = z
    .array(
        z.object({
            customFieldId: z.string().describe('The ID of the custom field'),
            sourceType: z
                .enum(['WORKSPACE', 'PROJECT', 'TIMEENTRY'])
                .optional()
                .describe('Custom field value source type'),
            value: z.unknown().describe('The value of the custom field'),
        })
    )
    .optional()
    .describe('Values for time entry custom fields');

const customAttributesSchema = z
    .array(
        z.object({
            name: z.string().describe('Custom attribute name'),
            namespace: z.string().describe('Custom attribute namespace'),
            value: z.string().describe('Custom attribute value'),
        })
    )
    .optional()
    .describe('Custom attributes of the time entry');

/** Body fields shared by creating and updating time entries. */
const timeEntryBodyShape = {
    billable: z.boolean().optional().describe('Whether the time entry is billable'),
    customFields: customFieldsSchema,
    description: z.string().optional().describe('Description of the time entry'),
    end: z.string().optional().describe('End date (ISO 8601 format)'),
    projectId: z.string().optional().describe('The ID of the project'),
    tagIds: z.array(z.string()).optional().describe('Array of tag IDs'),
    taskId: z.string().optional().describe('The ID of the task'),
    type: timeEntryTypeSchema.optional(),
};

const newTimeEntryBodyShape = {
    ...timeEntryBodyShape,
    customAttributes: customAttributesSchema,
    start: z.string().optional().describe('Start date (ISO 8601 format); omit to start a timer'),
};

function pickBody<T extends {workspaceId?: string; userId?: string}>(args: T) {
    const {workspaceId: _workspaceId, userId: _userId, ...body} = args;
    return body;
}

export function registerTimeEntryTools(server: McpServer) {
    defineTool(server, {
        name: 'get_time_entries',
        title: 'Get Time Entries',
        description: 'Get time entries of a user on a workspace, optionally filtered',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            description: z.string().optional().describe('Filter by description (contains)'),
            start: z.string().optional().describe('Start date (ISO 8601 format)'),
            end: z.string().optional().describe('End date (ISO 8601 format)'),
            project: z.string().optional().describe('Filter by project ID'),
            task: z.string().optional().describe('Filter by task ID'),
            tags: z.array(z.string()).optional().describe('Filter by tag IDs'),
            'project-required': z
                .boolean()
                .optional()
                .describe('Only return entries that have a project'),
            'task-required': z
                .boolean()
                .optional()
                .describe('Only return entries that have a task'),
            hydrated: hydratedSchema,
            'in-progress': z
                .boolean()
                .optional()
                .describe('Only return the running timer (true) or exclude it (false)'),
            'get-week-before': z
                .string()
                .optional()
                .describe('Return the last entry before this date (ISO 8601 format)'),
            timeViewMode: timeViewModeSchema,
            ...pageSchema,
        },
        action: 'fetch time entries',
        handler: async ({workspaceId: _w, userId: _u, ...query}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries`,
                {query}
            ),
    });

    defineTool(server, {
        name: 'get_time_entry',
        title: 'Get Time Entry',
        description: 'Get a specific time entry by ID',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            timeEntryId: z.string().describe('The ID of the time entry'),
            hydrated: hydratedSchema,
        },
        action: 'fetch time entry',
        handler: async ({timeEntryId, hydrated}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/${timeEntryId}`, {
                query: {hydrated},
            }),
    });

    defineTool(server, {
        name: 'get_time_entries_by_ids',
        title: 'Get Multiple Time Entries',
        description: 'Get multiple time entries on a workspace by their IDs',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            timeEntryIds: z.array(z.string()).describe('The IDs of the time entries'),
            hydrated: hydratedSchema,
        },
        action: 'fetch time entries',
        handler: async ({timeEntryIds, hydrated}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/batch`, {
                method: 'POST',
                body: {timeEntryIds, hydrated},
            }),
    });

    defineTool(server, {
        name: 'get_in_progress_time_entries',
        title: 'Get In-Progress Time Entries',
        description: 'Get all running (in-progress) time entries on a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...pageSchema},
        action: 'fetch in-progress time entries',
        handler: async ({workspaceId: _w, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/status/in-progress`, {
                query,
            }),
    });

    defineTool(server, {
        name: 'add_time_entry',
        title: 'Add Time Entry',
        description:
            'Add a time entry for the authenticated user. Omit end to start a running timer.',
        inputSchema: {workspaceId: workspaceIdSchema, ...newTimeEntryBodyShape},
        action: 'add time entry',
        handler: async (args, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries`, {
                method: 'POST',
                body: pickBody(args),
            }),
    });

    defineTool(server, {
        name: 'add_time_entry_for_user',
        title: 'Add Time Entry For User',
        description: 'Add a time entry for another user on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            'from-entry': z.string().optional().describe('ID of a time entry to copy from'),
            timeViewMode: timeViewModeSchema,
            ...newTimeEntryBodyShape,
        },
        action: 'add time entry for user',
        handler: async ({'from-entry': fromEntry, timeViewMode, ...args}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries`,
                {
                    method: 'POST',
                    query: {'from-entry': fromEntry, timeViewMode},
                    body: pickBody(args),
                }
            ),
    });

    defineTool(server, {
        name: 'update_time_entry',
        title: 'Update Time Entry',
        description: 'Update a time entry on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            timeEntryId: z.string().describe('The ID of the time entry'),
            ...timeEntryBodyShape,
            start: z.string().describe('Start date (ISO 8601 format)'),
        },
        action: 'update time entry',
        handler: async ({timeEntryId, ...args}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/${timeEntryId}`, {
                method: 'PUT',
                body: pickBody(args),
            }),
    });

    defineTool(server, {
        name: 'delete_time_entry',
        title: 'Delete Time Entry',
        description: 'Delete a time entry from a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            timeEntryId: z.string().describe('The ID of the time entry'),
        },
        action: 'delete time entry',
        handler: async ({timeEntryId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/${timeEntryId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'delete_user_time_entries',
        title: 'Delete User Time Entries',
        description: 'Delete multiple time entries of a user on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            timeEntryIds: z.array(z.string()).describe('The IDs of the time entries to delete'),
        },
        action: 'delete time entries',
        handler: async ({timeEntryIds}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries`,
                {
                    method: 'DELETE',
                    query: {'time-entry-ids': timeEntryIds},
                }
            ),
    });

    defineTool(server, {
        name: 'duplicate_time_entry',
        title: 'Duplicate Time Entry',
        description: 'Duplicate a time entry of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            timeEntryId: z.string().describe('The ID of the time entry'),
            timeViewMode: timeViewModeSchema,
        },
        action: 'duplicate time entry',
        handler: async ({timeEntryId, timeViewMode}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries/${timeEntryId}/duplicate`,
                {method: 'POST', query: {timeViewMode}}
            ),
    });

    defineTool(server, {
        name: 'stop_running_timer',
        title: 'Stop Running Timer',
        description: 'Stop the currently running timer of a user',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            end: z.string().describe('End date (ISO 8601 format)'),
        },
        action: 'stop running timer',
        handler: async ({end}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries`,
                {
                    method: 'PATCH',
                    body: {end},
                }
            ),
    });

    defineTool(server, {
        name: 'bulk_edit_time_entries',
        title: 'Bulk Edit Time Entries',
        description: 'Edit multiple time entries of a user at once',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            userId: userIdSchema,
            hydrated: hydratedSchema,
            timeViewMode: timeViewModeSchema,
            timeEntries: z
                .array(
                    z.object({
                        id: z.string().describe('The ID of the time entry'),
                        ...timeEntryBodyShape,
                        start: z.string().optional().describe('Start date (ISO 8601 format)'),
                    })
                )
                .describe('The time entries to edit'),
        },
        action: 'bulk edit time entries',
        handler: async ({timeEntries, hydrated, timeViewMode}, {workspaceId, userId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/user/${await userId()}/time-entries`,
                {
                    method: 'PUT',
                    query: {hydrated, timeViewMode},
                    body: timeEntries,
                }
            ),
    });

    defineTool(server, {
        name: 'mark_time_entries_invoiced',
        title: 'Mark Time Entries Invoiced',
        description: 'Mark time entries as invoiced or not invoiced',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            timeEntryIds: z.array(z.string()).describe('The IDs of the time entries'),
            invoiced: z.boolean().describe('Whether the time entries are invoiced'),
        },
        action: 'mark time entries as invoiced',
        handler: async ({timeEntryIds, invoiced}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/time-entries/invoiced`, {
                method: 'PATCH',
                body: {timeEntryIds, invoiced},
            }),
    });
}
