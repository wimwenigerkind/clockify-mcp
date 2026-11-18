import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const expenseIdSchema = z.string().describe('The ID of the expense');
const categoryIdSchema = z.string().describe('The ID of the expense category');

const expenseBodyShape = {
    amount: z.number().describe('Expense amount'),
    billable: z.boolean().optional().describe('Whether the expense is billable'),
    categoryId: z.string().describe('The ID of the expense category'),
    date: z.string().describe('Expense date (yyyy-MM-ddThh:mm:ssZ)'),
    file: z.string().describe('Receipt file content'),
    notes: z.string().optional().describe('Notes for the expense'),
    projectId: z.string().describe('The ID of the project'),
    taskId: z.string().optional().describe('The ID of the task'),
    userId: z.string().describe('The ID of the user the expense belongs to'),
};

const categoryBodyShape = {
    hasUnitPrice: z.boolean().optional().describe('Whether the category has a unit price'),
    name: z.string().describe('Name of the expense category'),
    priceInCents: z.number().int().optional().describe('Unit price in cents'),
    unit: z.string().optional().describe('Unit of the expense category'),
};

export function registerExpenseTools(server: McpServer) {
    defineTool(server, {
        name: 'get_expenses',
        title: 'Get Expenses',
        description: 'Get all expenses on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            'user-id': z
                .string()
                .optional()
                .describe('Filter by the user ID linked to the expense'),
            ...pageSchema,
        },
        action: 'fetch expenses',
        handler: async ({workspaceId: _w, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses`, {query}),
    });

    defineTool(server, {
        name: 'get_expense',
        title: 'Get Expense',
        description: 'Get an expense by ID',
        inputSchema: {workspaceId: workspaceIdSchema, expenseId: expenseIdSchema},
        action: 'fetch expense',
        handler: async ({expenseId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses/${expenseId}`),
    });

    defineTool(server, {
        name: 'add_expense',
        title: 'Add Expense',
        description: 'Create an expense',
        inputSchema: {workspaceId: workspaceIdSchema, ...expenseBodyShape},
        action: 'add expense',
        handler: async ({workspaceId: _w, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_expense',
        title: 'Update Expense',
        description: 'Update an expense',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            expenseId: expenseIdSchema,
            ...expenseBodyShape,
            changeFields: z
                .array(
                    z.enum([
                        'USER',
                        'DATE',
                        'PROJECT',
                        'TASK',
                        'CATEGORY',
                        'NOTES',
                        'AMOUNT',
                        'BILLABLE',
                        'FILE',
                    ])
                )
                .describe('The fields of the expense to change'),
        },
        action: 'update expense',
        handler: async ({workspaceId: _w, expenseId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses/${expenseId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_expense',
        title: 'Delete Expense',
        description: 'Delete an expense',
        inputSchema: {workspaceId: workspaceIdSchema, expenseId: expenseIdSchema},
        action: 'delete expense',
        handler: async ({expenseId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses/${expenseId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'get_expense_categories',
        title: 'Get Expense Categories',
        description: 'Get all expense categories on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            'sort-column': z.enum(['NAME']).optional().describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            archived: z.boolean().optional().describe('Filter by archived state'),
            name: z.string().optional().describe('Filter by name'),
            ...pageSchema,
        },
        action: 'fetch expense categories',
        handler: async ({workspaceId: _w, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses/categories`, {query}),
    });

    defineTool(server, {
        name: 'add_expense_category',
        title: 'Add Expense Category',
        description: 'Add an expense category',
        inputSchema: {workspaceId: workspaceIdSchema, ...categoryBodyShape},
        action: 'add expense category',
        handler: async ({workspaceId: _w, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/expenses/categories`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_expense_category',
        title: 'Update Expense Category',
        description: 'Update an expense category',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            categoryId: categoryIdSchema,
            ...categoryBodyShape,
        },
        action: 'update expense category',
        handler: async ({workspaceId: _w, categoryId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/expenses/categories/${categoryId}`,
                {
                    method: 'PUT',
                    body,
                }
            ),
    });

    defineTool(server, {
        name: 'archive_expense_category',
        title: 'Archive Expense Category',
        description: 'Archive or unarchive an expense category',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            categoryId: categoryIdSchema,
            archived: z.boolean().describe('Whether to archive the category'),
        },
        action: 'archive expense category',
        handler: async ({categoryId, archived}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/expenses/categories/${categoryId}/status`,
                {method: 'PATCH', body: {archived}}
            ),
    });

    defineTool(server, {
        name: 'delete_expense_category',
        title: 'Delete Expense Category',
        description: 'Delete an expense category',
        inputSchema: {workspaceId: workspaceIdSchema, categoryId: categoryIdSchema},
        action: 'delete expense category',
        handler: async ({categoryId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/expenses/categories/${categoryId}`,
                {
                    method: 'DELETE',
                }
            ),
    });
}
