import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, workspaceIdSchema} from './helpers.js';

const membershipFilter = (label: string) =>
    z
        .object({
            contains: z
                .enum(['CONTAINS', 'DOES_NOT_CONTAIN', 'CONTAINS_ONLY'])
                .optional()
                .describe(`Whether the ${label} list is included, excluded or exclusive`),
            ids: z.array(z.string()).optional().describe(`IDs of the ${label}`),
            status: z
                .enum(['ALL', 'ACTIVE', 'INACTIVE', 'PENDING', 'DECLINED'])
                .optional()
                .describe(`Status filter for the ${label}`),
        })
        .optional()
        .describe(`Filter describing which ${label} the item is assigned to`);

/** Shared by holidays and time off policies. */
export const automaticTimeEntryCreationSchema = z
    .object({
        enabled: z.boolean().optional().describe('Whether time entries are created automatically'),
        defaultEntities: z
            .object({
                projectId: z.string().optional().describe('Default project ID'),
                taskId: z.string().optional().describe('Default task ID'),
            })
            .describe('Default project and task for automatically created time entries'),
    })
    .optional()
    .describe('Automatic time entry creation settings');

export const usersFilterSchema = membershipFilter('users');
export const userGroupsFilterSchema = membershipFilter('user groups');

const holidayIdSchema = z.string().describe('The ID of the holiday');

const holidayBody = {
    name: z.string().describe('Name of the holiday'),
    datePeriod: z
        .object({
            startDate: z.string().describe('Start date (yyyy-MM-dd)'),
            endDate: z.string().describe('End date (yyyy-MM-dd)'),
        })
        .describe('Period of the holiday'),
    automaticTimeEntryCreation: automaticTimeEntryCreationSchema,
    color: z.string().optional().describe('Color of the holiday (hex, e.g. #FF5722)'),
    everyoneIncludingNew: z
        .boolean()
        .optional()
        .describe('Whether the holiday applies to everyone, including new members'),
    occursAnnually: z.boolean().optional().describe('Whether the holiday repeats every year'),
    userGroups: userGroupsFilterSchema,
    users: usersFilterSchema,
};

export function registerHolidayTools(server: McpServer) {
    defineTool(server, {
        name: 'get_holidays',
        title: 'Get Holidays',
        description: 'Get holidays on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            'assigned-to': z.string().optional().describe('Only holidays assigned to this user ID'),
        },
        action: 'fetch holidays',
        handler: async ({'assigned-to': assignedTo}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/holidays`, {
                query: {'assigned-to': assignedTo},
            }),
    });

    defineTool(server, {
        name: 'get_holidays_in_period',
        title: 'Get Holidays In Period',
        description: 'Get holidays assigned to a user within a specific period',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            'assigned-to': z.string().describe('ID of the user the holidays are assigned to'),
            start: z.string().describe('Start of the period (yyyy-MM-ddThh:mm:ssZ)'),
            end: z.string().describe('End of the period (yyyy-MM-ddThh:mm:ssZ)'),
        },
        action: 'fetch holidays in period',
        handler: async ({'assigned-to': assignedTo, start, end}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/holidays/in-period`, {
                query: {'assigned-to': assignedTo, start, end},
            }),
    });

    defineTool(server, {
        name: 'create_holiday',
        title: 'Create Holiday',
        description: 'Create a holiday on a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...holidayBody},
        action: 'create holiday',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/holidays`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_holiday',
        title: 'Update Holiday',
        description: 'Update a holiday on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            holidayId: holidayIdSchema,
            ...holidayBody,
            occursAnnually: z.boolean().describe('Whether the holiday repeats every year'),
        },
        action: 'update holiday',
        handler: async ({workspaceId: _, holidayId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/holidays/${holidayId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_holiday',
        title: 'Delete Holiday',
        description: 'Delete a holiday from a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, holidayId: holidayIdSchema},
        action: 'delete holiday',
        handler: async ({holidayId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/holidays/${holidayId}`, {
                method: 'DELETE',
            }),
    });
}
