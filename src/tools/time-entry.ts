import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {ClockifyService} from '../api/clockify-service.js';
import {ClockifyTimeEntry} from '../types/clockify.js';
import {formatJsonResponse} from '../utils/response-formatters.js';

const clockifyService = new ClockifyService();

function buildQueryString(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(value!)}`);

    return entries.length > 0 ? `?${entries.join('&')}` : '';
}

export function registerTimeEntryTools(server: McpServer) {
    // Tool: Get time entries
    server.registerTool(
        'get_time_entries',
        {
            title: 'Get Time Entries',
            description: 'Get time entries for a user within a date range',
            inputSchema: {
                workspaceId: z
                    .string()
                    .optional()
                    .describe('The ID of the workspace (optional, defaults to active workspace)'),
                userId: z
                    .string()
                    .optional()
                    .describe(
                        'The ID of the user to get time entries for (optional, defaults to self)'
                    ),
                start: z.string().optional().describe('Start date (ISO 8601 format)'),
                end: z.string().optional().describe('End date (ISO 8601 format)'),
            },
        },
        async ({workspaceId, userId, start, end}) => {
            try {
                const targetWorkspaceId =
                    workspaceId ?? (await clockifyService.getActiveWorkspaceId());
                const targetUserId = userId ?? (await clockifyService.getCurrentUser()).id;

                const queryString = buildQueryString({start, end});
                const timeEntries = await clockifyService.getUserTimeEntries(
                    targetWorkspaceId,
                    targetUserId,
                    queryString
                );

                return formatJsonResponse(
                    timeEntries.map((entry: ClockifyTimeEntry) => ({
                        id: entry.id,
                        description: entry.description,
                        projectId: entry.projectId,
                        taskId: entry.taskId,
                        billable: entry.billable,
                        timeInterval: entry.timeInterval,
                        userId: entry.userId,
                        workspaceId: entry.workspaceId,
                        tagIds: entry.tags,
                        costRate: entry.costRate,
                        hourlyRate: entry.hourlyRate,
                        customFieldValues: entry.customFieldValues,
                        isLocked: entry.isLocked,
                        kioskId: entry.kioskId,
                        type: entry.type,
                    }))
                );
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch time entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );

    // Tool: Add time entry
    server.registerTool(
        'add_time_entry',
        {
            title: 'Add Time Entry',
            description: 'Add time entry for authenticated user',
            inputSchema: {
                workspaceId: z
                    .string()
                    .optional()
                    .describe('The ID of the workspace (optional, defaults to active workspace)'),
                projectId: z.string().describe('The ID of the project'),
                description: z.string().describe('Description of the time entry'),
                start: z.string().describe('Start date (ISO 8601 format)'),
                end: z.string().describe('End date (ISO 8601 format)'),
                taskId: z.string().describe('The ID of the task'),
                tagIds: z.string().array().optional().describe('Array of tag IDs'),
            },
        },
        async ({workspaceId, projectId, description, start, end, taskId, tagIds}) => {
            try {
                const targetWorkspaceId =
                    workspaceId ?? (await clockifyService.getActiveWorkspaceId());

                const entry = await clockifyService.addTimeEntry(targetWorkspaceId, {
                    description,
                    start,
                    end,
                    taskId,
                    tagIds,
                    projectId,
                });

                return formatJsonResponse({
                    id: entry.id,
                    description: entry.description,
                    billable: entry.billable,
                    customFieldValues: entry.customFieldValues,
                    isLocked: entry.isLocked,
                    kioskId: entry.kioskId,
                    projectId: entry.projectId,
                    tagIds: entry.tagIds,
                    taskId: entry.taskId,
                    timeInterval: entry.timeInterval,
                    type: entry.type,
                    userId: entry.userId,
                    workspaceId: entry.workspaceId,
                });
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to add time entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );
}
