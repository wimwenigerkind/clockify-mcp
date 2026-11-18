import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {clockifyRequest} from '../api/client.js';
import {defineTool, pageSchema, rateSchema, workspaceIdSchema} from './helpers.js';

const projectIdSchema = z.string().describe('The ID of the project');
const taskIdSchema = z.string().describe('The ID of the task');

const taskFields = {
    assigneeIds: z.array(z.string()).optional().describe('IDs of assigned users'),
    userGroupIds: z.array(z.string()).optional().describe('IDs of assigned user groups'),
    estimate: z.string().optional().describe('Time estimate as ISO 8601 duration, e.g. PT2H'),
    status: z.enum(['ACTIVE', 'DONE', 'ALL']).optional().describe('Task status'),
    billable: z.boolean().optional().describe('Whether the task is billable'),
    budgetEstimate: z.number().int().optional().describe('Budget estimate of the task'),
};

export function registerTaskTools(server: McpServer) {
    defineTool(server, {
        name: 'get_tasks_on_project',
        title: 'Get Tasks on Project',
        description: 'Get all tasks on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            name: z.string().optional().describe('Filter tasks by name (partial match)'),
            'strict-name-search': z
                .boolean()
                .optional()
                .describe('Only return tasks whose name exactly matches the name filter'),
            'is-active': z.boolean().optional().describe('Filter by active status'),
            'sort-column': z.enum(['ID', 'NAME']).optional().describe('Column to sort by'),
            'sort-order': z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order'),
            ...pageSchema,
        },
        action: 'fetch tasks on project',
        handler: async ({workspaceId: _, projectId, ...query}, {workspaceId}) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}/tasks`, {
                query,
            }),
    });

    defineTool(server, {
        name: 'get_task',
        title: 'Get Task',
        description: 'Get a task by ID',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            taskId: taskIdSchema,
        },
        action: 'fetch task',
        handler: async ({projectId, taskId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/tasks/${taskId}`
            ),
    });

    defineTool(server, {
        name: 'add_tasks_on_project',
        title: 'Add Task on Project',
        description: 'Create a new task on a project',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            name: z.string().describe('Name of the task'),
            ...taskFields,
            'contains-assignee': z
                .boolean()
                .optional()
                .describe('Whether the created task contains its assignees in the response'),
        },
        action: 'add task on project',
        handler: async (
            {workspaceId: _, projectId, 'contains-assignee': containsAssignee, ...body},
            {workspaceId}
        ) =>
            clockifyRequest(`/workspaces/${await workspaceId()}/projects/${projectId}/tasks`, {
                method: 'POST',
                query: {'contains-assignee': containsAssignee},
                body,
            }),
    });

    defineTool(server, {
        name: 'update_task',
        title: 'Update Task',
        description: 'Update a task (name, status, assignees, estimate, billable)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            taskId: taskIdSchema,
            name: z.string().describe('New name of the task'),
            ...taskFields,
            'contains-assignee': z
                .boolean()
                .optional()
                .describe('Whether the response contains the assignees'),
            'membership-status': z
                .enum(['PENDING', 'ACTIVE', 'DECLINED', 'INACTIVE', 'ALL'])
                .optional()
                .describe('Membership status filter for the assignees'),
        },
        action: 'update task',
        handler: async (
            {
                workspaceId: _,
                projectId,
                taskId,
                'contains-assignee': containsAssignee,
                'membership-status': membershipStatus,
                ...body
            },
            {workspaceId}
        ) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/tasks/${taskId}`,
                {
                    method: 'PUT',
                    query: {
                        'contains-assignee': containsAssignee,
                        'membership-status': membershipStatus,
                    },
                    body,
                }
            ),
    });

    defineTool(server, {
        name: 'delete_task',
        title: 'Delete Task',
        description: 'Delete a task (the task must be marked as done first)',
        inputSchema: {
            workspaceId: workspaceIdSchema,
            projectId: projectIdSchema,
            taskId: taskIdSchema,
        },
        action: 'delete task',
        handler: async ({projectId, taskId}, {workspaceId}) =>
            clockifyRequest(
                `/workspaces/${await workspaceId()}/projects/${projectId}/tasks/${taskId}`,
                {method: 'DELETE'}
            ),
    });

    for (const [kind, path] of [
        ['hourly', 'hourly-rate'],
        ['cost', 'cost-rate'],
    ] as const) {
        defineTool(server, {
            name: `update_task_${kind}_rate`,
            title: `Update Task ${kind === 'hourly' ? 'Hourly' : 'Cost'} Rate`,
            description: `Update the ${kind === 'hourly' ? 'hourly (billable)' : 'cost'} rate of a task`,
            inputSchema: {
                workspaceId: workspaceIdSchema,
                projectId: projectIdSchema,
                taskId: taskIdSchema,
                ...rateSchema,
            },
            action: `update task ${kind} rate`,
            handler: async ({projectId, taskId, amount, since}, {workspaceId}) =>
                clockifyRequest(
                    `/workspaces/${await workspaceId()}/projects/${projectId}/tasks/${taskId}/${path}`,
                    {method: 'PUT', body: {amount, since}}
                ),
        });
    }
}
