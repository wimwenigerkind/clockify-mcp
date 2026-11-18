import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, workspaceIdSchema} from './helpers.js';

const invoiceIdSchema = z.string().describe('The ID of the invoice');
const invoiceStatusSchema = z.enum(['UNSENT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID', 'OVERDUE']);
const sortColumnSchema = z
    .enum(['ID', 'CLIENT', 'DUE_ON', 'ISSUE_DATE', 'AMOUNT', 'BALANCE'])
    .describe('Column to sort by');
const sortOrderSchema = z.enum(['ASCENDING', 'DESCENDING']).describe('Sort order');
const taxTypeSchema = z.enum(['COMPOUND', 'SIMPLE', 'NONE']);

const idFilterSchema = z.object({
    contains: z
        .enum(['CONTAINS', 'DOES_NOT_CONTAIN', 'CONTAINS_ONLY'])
        .optional()
        .describe('Filter type'),
    ids: z.array(z.string()).optional().describe('Filter IDs'),
});

const labelSchema = (what: string) => z.string().describe(`Label for ${what}`);

export function registerInvoiceTools(server: McpServer) {
    defineTool(server, {
        name: 'get_invoices',
        title: 'Get Invoices',
        description: 'Get all invoices on a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            statuses: z
                .array(invoiceStatusSchema)
                .optional()
                .describe('Filter by invoice statuses'),
            'sort-column': sortColumnSchema.optional(),
            'sort-order': sortOrderSchema.optional(),
            ...pageSchema,
        },
        action: 'fetch invoices',
        handler: async ({workspaceId: _w, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices`, {query}),
    });

    defineTool(server, {
        name: 'filter_invoices',
        title: 'Filter Invoices',
        description: 'Filter invoices on a workspace by client, company, amount, balance and more',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            clients: idFilterSchema
                .extend({
                    status: z
                        .enum(['ACTIVE', 'ARCHIVED', 'ALL'])
                        .optional()
                        .describe('Filter clients by status'),
                })
                .optional()
                .describe('Client filter'),
            companies: idFilterSchema.optional().describe('Company filter'),
            exactAmount: z.number().int().optional().describe('Exact invoice amount'),
            exactBalance: z.number().int().optional().describe('Exact invoice balance'),
            greaterThanAmount: z.number().int().optional().describe('Minimum invoice amount'),
            greaterThanBalance: z.number().int().optional().describe('Minimum invoice balance'),
            lessThanAmount: z.number().int().optional().describe('Maximum invoice amount'),
            lessThanBalance: z.number().int().optional().describe('Maximum invoice balance'),
            invoiceNumber: z.string().optional().describe('Text contained in the invoice number'),
            issueDate: z
                .object({
                    'issue-date-start': z.string().optional().describe('Start date (yyyy-MM-dd)'),
                    'issue-date-end': z.string().optional().describe('End date (yyyy-MM-dd)'),
                })
                .optional()
                .describe('Issue date range'),
            statuses: z
                .array(invoiceStatusSchema)
                .optional()
                .describe('Filter by invoice statuses'),
            strictSearch: z
                .boolean()
                .optional()
                .describe('Search the invoice number by exact match only'),
            page: pageSchema.page,
            pageSize: pageSchema['page-size'],
            sortColumn: sortColumnSchema.optional(),
            sortOrder: sortOrderSchema.optional(),
        },
        action: 'filter invoices',
        handler: async ({workspaceId: _w, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/info`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'get_invoice',
        title: 'Get Invoice',
        description: 'Get an invoice by ID',
        inputSchema: {workspaceId: workspaceIdSchema, invoiceId: invoiceIdSchema},
        action: 'fetch invoice',
        handler: async ({invoiceId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}`),
    });

    defineTool(server, {
        name: 'add_invoice',
        title: 'Add Invoice',
        description: 'Add an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            clientId: z.string().describe('The ID of the client'),
            currency: z.string().describe('Currency of the invoice'),
            dueDate: z.string().describe('Due date (yyyy-MM-ddThh:mm:ssZ)'),
            issuedDate: z.string().describe('Issued date (yyyy-MM-ddThh:mm:ssZ)'),
            number: z.string().describe('Invoice number'),
            timeViewMode: z
                .enum(['TIME_SENSITIVE_VIEW', 'AGGREGATED_TIME_VIEW'])
                .optional()
                .describe('Time view mode'),
        },
        action: 'add invoice',
        handler: async ({workspaceId: _w, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'update_invoice',
        title: 'Update Invoice',
        description: 'Update an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            clientId: z.string().optional().describe('The ID of the client'),
            companyId: z.string().optional().describe('The ID of the company'),
            currency: z.string().describe('Currency of the invoice'),
            discountPercent: z.number().describe('Discount in percent'),
            dueDate: z.string().describe('Due date (yyyy-MM-ddThh:mm:ssZ)'),
            issuedDate: z.string().describe('Issued date (yyyy-MM-ddThh:mm:ssZ)'),
            note: z.string().optional().describe('Invoice note'),
            number: z.string().describe('Invoice number'),
            subject: z.string().optional().describe('Invoice subject'),
            tax2Percent: z.number().describe('Tax 2 in percent'),
            taxPercent: z.number().describe('Tax in percent'),
            taxType: taxTypeSchema.optional().describe('Taxation type'),
            visibleZeroFields: z
                .enum(['TAX', 'TAX_2', 'DISCOUNT'])
                .optional()
                .describe('Zero value field that stays visible'),
        },
        action: 'update invoice',
        handler: async ({workspaceId: _w, invoiceId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}`, {
                method: 'PUT',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_invoice',
        title: 'Delete Invoice',
        description: 'Delete an invoice',
        inputSchema: {workspaceId: workspaceIdSchema, invoiceId: invoiceIdSchema},
        action: 'delete invoice',
        handler: async ({invoiceId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}`, {
                method: 'DELETE',
            }),
    });

    defineTool(server, {
        name: 'duplicate_invoice',
        title: 'Duplicate Invoice',
        description: 'Duplicate an invoice',
        inputSchema: {workspaceId: workspaceIdSchema, invoiceId: invoiceIdSchema},
        action: 'duplicate invoice',
        handler: async ({invoiceId}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/duplicate`, {
                method: 'POST',
            }),
    });

    defineTool(server, {
        name: 'export_invoice',
        title: 'Export Invoice',
        description: 'Export an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            userLocale: z.string().describe('Locale for the export, e.g. "en"'),
        },
        action: 'export invoice',
        handler: async ({invoiceId, userLocale}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/export`, {
                query: {userLocale},
            }),
    });

    defineTool(server, {
        name: 'change_invoice_status',
        title: 'Change Invoice Status',
        description: 'Change the status of an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            invoiceStatus: invoiceStatusSchema.describe('The status to set'),
        },
        action: 'change invoice status',
        handler: async ({invoiceId, invoiceStatus}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/status`, {
                method: 'PATCH',
                body: {invoiceStatus},
            }),
    });

    defineTool(server, {
        name: 'add_invoice_item',
        title: 'Add Invoice Item',
        description: 'Add an item to an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            applyTaxes: z
                .enum(['TAX1', 'TAX2', 'TAX1TAX2', 'NONE'])
                .describe('Taxes applied to the item'),
            description: z.string().describe('Item description'),
            itemType: z.string().describe('Item type, e.g. "Service"'),
            quantity: z.number().int().describe('Item quantity'),
            unitPrice: z.number().int().describe('Item unit price'),
        },
        action: 'add invoice item',
        handler: async ({workspaceId: _w, invoiceId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/items`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'import_invoice_items',
        title: 'Import Invoice Items',
        description: 'Import time entries and expenses into an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            from: z.string().describe('Start of the period (yyyy-MM-ddThh:mm:ssZ)'),
            to: z.string().describe('End of the period (yyyy-MM-ddThh:mm:ssZ)'),
            importExpenses: z.boolean().describe('Also import billable expenses'),
            projectFilter: idFilterSchema
                .extend({
                    status: z
                        .enum(['ACTIVE', 'ARCHIVED', 'ALL'])
                        .optional()
                        .describe('Filter projects by status'),
                })
                .describe('Project filter for imported items'),
            roundTimeEntryDuration: z
                .boolean()
                .optional()
                .describe('Round imported durations to 15 minutes'),
            timeEntryGroupType: z
                .enum(['SINGLE_ITEM', 'GROUPED', 'DETAILED'])
                .describe('Time entry group type'),
            timeEntryPrimaryGroupBy: z
                .enum(['USER', 'PROJECT', 'DATE'])
                .optional()
                .describe('Primary group field for GROUPED time entries'),
            timeEntrySecondaryGroupBy: z
                .enum(['PROJECT', 'USER', 'TASK', 'DATE', 'DESCRIPTION', 'NONE'])
                .optional()
                .describe('Secondary group field for GROUPED time entries'),
            timeEntryFieldsForDetailedGroup: z
                .array(z.enum(['PROJECT', 'TASK', 'TAGS', 'DESCRIPTION', 'DATE', 'USER']))
                .optional()
                .describe('Fields to include for DETAILED time entries'),
            expensesGroupType: z
                .enum(['GROUPED', 'DETAILED'])
                .optional()
                .describe('Expense group type'),
            expensesGroupBy: z
                .enum(['CATEGORY', 'PROJECT', 'USER'])
                .optional()
                .describe('Group field for GROUPED expenses'),
            expenseFieldsForDetailedGroup: z
                .array(z.enum(['PROJECT', 'TASK', 'CATEGORY', 'NOTE', 'DATE', 'USER']))
                .optional()
                .describe('Fields to include for DETAILED expenses'),
        },
        action: 'import invoice items',
        handler: async ({workspaceId: _w, invoiceId, ...body}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/invoices/${invoiceId}/items/import`,
                {method: 'POST', body}
            ),
    });

    defineTool(server, {
        name: 'delete_invoice_item',
        title: 'Delete Invoice Item',
        description: 'Delete an item from an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            order: z.number().int().describe('The order (position) of the item in the invoice'),
        },
        action: 'delete invoice item',
        handler: async ({invoiceId, order}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/invoices/${invoiceId}/items/${order}`,
                {method: 'DELETE'}
            ),
    });

    defineTool(server, {
        name: 'get_invoice_payments',
        title: 'Get Invoice Payments',
        description: 'Get payments of an invoice',
        inputSchema: {workspaceId: workspaceIdSchema, invoiceId: invoiceIdSchema, ...pageSchema},
        action: 'fetch invoice payments',
        handler: async ({workspaceId: _w, invoiceId, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/payments`, {
                query,
            }),
    });

    defineTool(server, {
        name: 'add_invoice_payment',
        title: 'Add Invoice Payment',
        description: 'Add a payment to an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            amount: z.number().int().optional().describe('Payment amount'),
            note: z.string().optional().describe('Payment note'),
            paymentDate: z.string().optional().describe('Payment date (yyyy-MM-ddThh:mm:ssZ)'),
        },
        action: 'add invoice payment',
        handler: async ({workspaceId: _w, invoiceId, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/${invoiceId}/payments`, {
                method: 'POST',
                body,
            }),
    });

    defineTool(server, {
        name: 'delete_invoice_payment',
        title: 'Delete Invoice Payment',
        description: 'Delete a payment from an invoice',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            invoiceId: invoiceIdSchema,
            paymentId: z.string().describe('The ID of the payment'),
        },
        action: 'delete invoice payment',
        handler: async ({invoiceId, paymentId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/invoices/${invoiceId}/payments/${paymentId}`,
                {method: 'DELETE'}
            ),
    });

    defineTool(server, {
        name: 'get_invoice_settings',
        title: 'Get Invoice Settings',
        description: 'Get the invoice settings of a workspace',
        inputSchema: {workspaceId: workspaceIdSchema},
        action: 'fetch invoice settings',
        handler: async (_, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/settings`),
    });

    defineTool(server, {
        name: 'update_invoice_settings',
        title: 'Update Invoice Settings',
        description: 'Change the invoice settings of a workspace',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            defaults: z
                .object({
                    companyId: z.string().optional().describe('Default company ID'),
                    dueDays: z.number().int().optional().describe('Default number of due days'),
                    itemTypeId: z.string().optional().describe('Default item type ID'),
                    notes: z.string().describe('Default invoice note'),
                    subject: z.string().describe('Default invoice subject'),
                    tax2Percent: z.number().optional().describe('Default tax 2 in percent'),
                    taxPercent: z.number().optional().describe('Default tax in percent'),
                    taxType: taxTypeSchema.optional().describe('Default tax type'),
                })
                .optional()
                .describe('Invoice default settings'),
            exportFields: z
                .object({
                    itemType: z.boolean().optional().describe('Export item type'),
                    quantity: z.boolean().optional().describe('Export quantity'),
                    rtl: z.boolean().optional().describe('Export RTL'),
                    tax: z.boolean().optional().describe('Export tax'),
                    tax2: z.boolean().optional().describe('Export tax 2'),
                    unitPrice: z.boolean().optional().describe('Export unit price'),
                })
                .optional()
                .describe('Invoice export fields'),
            labels: z
                .object({
                    amount: labelSchema('amount'),
                    billFrom: labelSchema('bill from'),
                    billTo: labelSchema('bill to'),
                    description: labelSchema('description'),
                    discount: labelSchema('discount'),
                    dueDate: labelSchema('due date'),
                    issueDate: labelSchema('issue date'),
                    itemType: labelSchema('item type'),
                    notes: labelSchema('notes'),
                    paid: labelSchema('paid amount'),
                    quantity: labelSchema('quantity'),
                    subtotal: labelSchema('subtotal'),
                    tax: labelSchema('tax'),
                    tax2: labelSchema('tax 2'),
                    total: labelSchema('total'),
                    totalAmountDue: labelSchema('total amount due'),
                    unitPrice: labelSchema('unit price'),
                })
                .describe('Invoice label customization'),
        },
        action: 'update invoice settings',
        handler: async ({workspaceId: _w, ...body}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/invoices/settings`, {
                method: 'PUT',
                body,
            }),
    });
}
