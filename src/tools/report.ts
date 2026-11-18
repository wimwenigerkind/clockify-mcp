import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z, ZodRawShape} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {CLOCKIFY_REPORTS_BASE_URL} from '../config/constants.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const containsFilter = (what: string) =>
    z
        .object({
            ids: z.array(z.string()).optional().describe(`IDs of ${what}`),
            contains: z
                .enum(['CONTAINS', 'DOES_NOT_CONTAIN', 'CONTAINS_ONLY'])
                .optional()
                .describe('How the IDs are matched'),
            status: z.string().optional().describe('Status filter, e.g. ACTIVE, ARCHIVED, ALL'),
            numberOfFilters: z.number().int().optional().describe('Number of filters applied'),
        })
        .optional()
        .describe(`Filter by ${what}`);

const customFieldFilter = z
    .object({
        customFieldId: z.string().describe('ID of the custom field'),
        value: z.unknown().describe('Value to match'),
        numberCondition: z
            .enum([
                'EQUAL',
                'NOT_EQUAL',
                'LESS_THAN',
                'GREATER_THAN',
                'LESS_THAN_OR_EQUAL',
                'GREATER_THAN_OR_EQUAL',
            ])
            .optional()
            .describe('Condition for number custom fields'),
        emptyFilter: z.boolean().optional().describe('Match empty values only'),
    })
    .describe('Custom field filter');

/** Filter fields shared by all time-entry and team reports. */
const commonFilterShape = {
    dateRangeStart: z.string().describe('Start of the date range (ISO 8601 date-time)'),
    dateRangeEnd: z.string().describe('End of the date range (ISO 8601 date-time)'),
    dateRangeType: z
        .enum([
            'ABSOLUTE',
            'TODAY',
            'YESTERDAY',
            'THIS_WEEK',
            'LAST_WEEK',
            'THIS_MONTH',
            'LAST_MONTH',
            'THIS_YEAR',
            'LAST_YEAR',
        ])
        .optional()
        .describe('Date range type'),
    amountShown: z
        .enum(['EARNED', 'COST', 'PROFIT', 'HIDE_AMOUNT', 'EXPORT'])
        .optional()
        .describe('Which amount to show'),
    amounts: z
        .array(z.string())
        .optional()
        .describe('Amounts to include, e.g. EARNED, COST, PROFIT'),
    billable: z.boolean().optional().describe('Filter by billable'),
    approvalState: z.enum(['APPROVED', 'UNAPPROVED', 'ALL']).optional().describe('Approval state'),
    invoicingState: z
        .enum(['INVOICED', 'UNINVOICED', 'ALL'])
        .optional()
        .describe('Invoicing state'),
    description: z.string().optional().describe('Filter by entry description'),
    withoutDescription: z.boolean().optional().describe('Only entries without description'),
    clients: containsFilter('clients'),
    projects: containsFilter('projects'),
    tasks: containsFilter('tasks'),
    tags: containsFilter('tags'),
    users: containsFilter('users'),
    userGroups: containsFilter('user groups'),
    customFields: z.array(customFieldFilter).optional().describe('Custom field filters'),
    userCustomFields: z.array(customFieldFilter).optional().describe('User custom field filters'),
    currencies: containsFilter('currencies'),
    rounding: z.boolean().optional().describe('Round durations'),
    zoomLevel: z.enum(['WEEK', 'MONTH', 'YEAR']).optional().describe('Zoom level'),
    timeZone: z.string().optional().describe('Time zone, e.g. Europe/Berlin'),
    userLocale: z.string().optional().describe('Locale, e.g. en_GB'),
    exportType: z
        .enum(['JSON', 'JSON_V1', 'PDF', 'CSV', 'XLSX', 'ZIP'])
        .optional()
        .describe('Export format (default JSON)'),
    sortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
};

const paginationFilter = {
    page: z.number().int().min(1).optional().describe('Page number'),
    pageSize: z.number().int().min(1).max(1000).optional().describe('Items per page'),
};

const summaryFilterShape = z
    .object({
        groups: z
            .array(z.string())
            .describe('Grouping levels, e.g. PROJECT, USER, CLIENT, TASK, TAG, DATE, TIMEENTRY'),
        sortColumn: z
            .string()
            .optional()
            .describe('Column to sort by, e.g. GROUP, DURATION, AMOUNT'),
        summaryChartType: z.string().optional().describe('Chart type, e.g. BILLABILITY'),
    })
    .describe('Summary report grouping');

const detailedFilterShape = z
    .object({
        ...paginationFilter,
        sortColumn: z
            .string()
            .optional()
            .describe('Column to sort by, e.g. ID, DESCRIPTION, USER, DURATION, DATE'),
        options: z
            .object({totals: z.string().optional().describe('Totals mode, e.g. CALCULATE')})
            .optional()
            .describe('Additional options'),
        auditFilter: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Audit filter (e.g. changed entries)'),
    })
    .optional()
    .describe('Detailed report options (pagination and sorting)');

const weeklyFilterShape = z
    .object({
        group: z.string().describe('Primary grouping, e.g. USER, PROJECT, TAG'),
        subgroup: z.string().optional().describe('Secondary grouping'),
    })
    .describe('Weekly report grouping');

const attendanceFilterShape = z
    .object({
        ...paginationFilter,
        sortColumn: z.string().optional().describe('Column to sort by'),
    })
    .optional()
    .describe('Attendance report options (pagination and sorting)');

const sharedReportShape = {
    name: z.string().describe('Name of the shared report'),
    type: z
        .enum(['DETAILED', 'WEEKLY', 'SUMMARY'])
        .optional()
        .describe('Report type (required when creating)'),
    isPublic: z.boolean().optional().describe('Whether the report is public'),
    fixedDate: z.boolean().optional().describe('Whether the date range is fixed'),
    visibleToUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users the report is visible to'),
    visibleToUserGroups: z
        .array(z.string())
        .optional()
        .describe('IDs of user groups the report is visible to'),
    filter: z
        .object({
            ...commonFilterShape,
            summaryFilter: summaryFilterShape.optional(),
            weeklyFilter: weeklyFilterShape.optional(),
        })
        .partial()
        .optional()
        .describe('Report filter'),
};

function defineReport<Shape extends ZodRawShape>(
    server: McpServer,
    name: string,
    title: string,
    path: string,
    extra: Shape
) {
    defineTool(server, {
        name,
        title,
        description: `Generate a ${title.toLowerCase()} for a workspace (Reports API)`,
        inputSchema: {workspaceId: workspaceIdSchema, ...commonFilterShape, ...extra},
        action: `generate ${title.toLowerCase()}`,
        // zod 4 cannot infer the keys of the generic `extra` shape, so the args are narrowed here.
        handler: async (args, {workspaceId}) => {
            const {workspaceId: _, ...body} = args as {workspaceId?: string};
            return clockifyRequest(`/workspaces/${await workspaceId()}/reports/${path}`, {
                method: 'POST',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                body,
            });
        },
    });
}

export function registerReportTools(server: McpServer) {
    defineReport(server, 'get_summary_report', 'Summary Report', 'summary', {
        summaryFilter: summaryFilterShape,
    });
    defineReport(server, 'get_detailed_report', 'Detailed Report', 'detailed', {
        detailedFilter: detailedFilterShape,
    });
    defineReport(server, 'get_weekly_report', 'Weekly Report', 'weekly', {
        weeklyFilter: weeklyFilterShape,
    });
    defineReport(server, 'get_attendance_report', 'Attendance Report', 'attendance', {
        attendanceFilter: attendanceFilterShape,
    });

    defineTool(server, {
        name: 'get_expense_report',
        title: 'Get Expense Report',
        description: 'Generate an expense report for a workspace (Reports API)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            dateRangeStart: z.string().describe('Start of the date range (ISO 8601 date-time)'),
            dateRangeEnd: z.string().describe('End of the date range (ISO 8601 date-time)'),
            dateRangeType: z
                .string()
                .optional()
                .describe('Date range type, e.g. ABSOLUTE, THIS_MONTH'),
            approvalState: z
                .enum(['APPROVED', 'UNAPPROVED', 'ALL'])
                .optional()
                .describe('Approval state'),
            invoicingState: z
                .enum(['INVOICED', 'UNINVOICED', 'ALL'])
                .optional()
                .describe('Invoicing state'),
            billable: z.boolean().optional().describe('Filter by billable'),
            note: z.string().optional().describe('Filter by expense note'),
            categories: containsFilter('expense categories'),
            clients: containsFilter('clients'),
            projects: containsFilter('projects'),
            tasks: containsFilter('tasks'),
            users: containsFilter('users'),
            userGroups: containsFilter('user groups'),
            currency: containsFilter('currencies'),
            sortColumn: z
                .enum(['ID', 'PROJECT', 'USER', 'CATEGORY', 'DATE', 'AMOUNT'])
                .optional()
                .describe('Column to sort by'),
            sortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            exportType: z
                .enum(['JSON', 'JSON_V1', 'PDF', 'CSV', 'XLSX', 'ZIP'])
                .optional()
                .describe('Export type'),
            timeZone: z.string().optional().describe('Time zone, e.g. Europe/Berlin'),
            userLocale: z.string().optional().describe('Locale, e.g. en_GB'),
            page: z.number().int().min(1).optional().describe('Page number'),
            pageSize: z.number().int().min(1).max(1000).optional().describe('Items per page'),
        },
        action: 'generate expense report',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/reports/expenses/detailed`, {
                method: 'POST',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                body,
            }),
    });

    defineTool(server, {
        name: 'get_audit_log',
        title: 'Get Audit Log',
        description: 'Generate an audit log report for a workspace (Reports API)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            start: z.string().optional().describe('Start of the period (ISO 8601 date-time)'),
            end: z.string().optional().describe('End of the period (ISO 8601 date-time)'),
            actions: z
                .array(z.string())
                .optional()
                .describe('Audit actions to include, e.g. CREATE_PROJECT, UPDATE_TASK, DELETE_TAG'),
            authors: z
                .object({
                    authorIds: z.array(z.string()).optional().describe('IDs of the authors'),
                    contains: z
                        .enum(['CONTAINS', 'DOES_NOT_CONTAIN'])
                        .optional()
                        .describe('Match mode'),
                })
                .optional()
                .describe('Filter by authors'),
            page: z.number().int().min(1).optional().describe('Page number'),
            'page-size': z.number().int().min(1).max(1000).optional().describe('Items per page'),
        },
        action: 'generate audit log',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/audit-log`, {
                method: 'POST',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                body,
            }),
    });

    defineTool(server, {
        name: 'get_shared_reports',
        title: 'Get Shared Reports',
        description: 'Get all shared reports of the authenticated user in a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...pageSchema},
        action: 'fetch shared reports',
        handler: async ({page, 'page-size': pageSize}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/shared-reports`, {
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                query: {page, 'page-size': pageSize},
            }),
    });

    defineTool(server, {
        name: 'get_shared_report',
        title: 'Generate Shared Report',
        description: 'Generate a shared report by ID',
        inputSchema: {
            sharedReportId: z.string().describe('The ID of the shared report'),
            exportType: z
                .enum(['JSON', 'JSON_V1', 'PDF', 'CSV', 'XLSX', 'ZIP'])
                .optional()
                .describe('Export format (default JSON)'),
            page: pageSchema.page,
            pageSize: z.number().int().min(1).max(1000).optional().describe('Items per page'),
        },
        action: 'generate shared report',
        handler: ({sharedReportId, ...query}) =>
            clockifyRequest(`/shared-reports/${sharedReportId}`, {
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                query,
            }),
    });

    defineTool(server, {
        name: 'add_shared_report',
        title: 'Add Shared Report',
        description: 'Create a shared report in a workspace',
        inputSchema: {workspaceId: workspaceIdSchema, ...sharedReportShape},
        action: 'create shared report',
        handler: async ({workspaceId: _, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/shared-reports`, {
                method: 'POST',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                body,
            }),
    });

    defineTool(server, {
        name: 'update_shared_report',
        title: 'Update Shared Report',
        description: 'Update a shared report',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            sharedReportId: z.string().describe('The ID of the shared report'),
            ...sharedReportShape,
        },
        action: 'update shared report',
        handler: async ({workspaceId: _, sharedReportId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/shared-reports/${sharedReportId}`, {
                method: 'PUT',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_shared_report',
        title: 'Delete Shared Report',
        description: 'Delete a shared report',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            sharedReportId: z.string().describe('The ID of the shared report'),
        },
        action: 'delete shared report',
        handler: async ({sharedReportId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/shared-reports/${sharedReportId}`, {
                method: 'DELETE',
                baseUrl: CLOCKIFY_REPORTS_BASE_URL,
            }),
    });
}
