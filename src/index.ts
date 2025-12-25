#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
    ClockifyClient,
    ClockifyProject,
    ClockifyTask,
    ClockifyTimeEntry,
} from './types/clockify.js';
import { clockifyRequest } from './api/client.js';
import {registerWorkspaceTools} from "./tools/workspace-tools.js";

export const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;
export const CLOCKIFY_API_BASE_URL = (process.env.CLOCKIFY_API_BASE_URL ??
    'https://api.clockify.me/api/v1') as string;
const JSON_INDENT_SPACES = 2;

if (!CLOCKIFY_API_KEY) {
    console.error('Error: CLOCKIFY_API_KEY environment variable is required');
    process.exit(1);
}

const server = new McpServer({
    name: 'clockify-server',
    version: '0.0.1',
});

export function formatJsonResponse(data: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(data, null, JSON_INDENT_SPACES),
            },
        ],
    };
}

registerWorkspaceTools(server);

// Tool: Get current user
server.registerTool(
    'get_current_user',
    {
        title: 'Get Current User',
        description: 'Get information about the currently authenticated Clockify user',
        inputSchema: {},
    },
    async () => {
        const user = await clockifyRequest('/user');
        return formatJsonResponse({
            id: user.id,
            name: user.name,
            email: user.email,
            activeWorkspace: user.activeWorkspace,
            profilePicture: user.profilePicture,
            memberships: user.memberships,
        });
    }
);

// Tool: Get clients on workspace
server.registerTool(
    'get_clients_on_workspace',
    {
        title: 'Get Clients on Workspace',
        description:
            'Get all clients on a workspace (defaults to active workspace if not specified)',
        inputSchema: {
            workspaceId: z
                .string()
                .optional()
                .describe(
                    'The ID of the workspace to get clients from (optional, defaults to active workspace)'
                ),
        },
    },
    async ({ workspaceId }) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user');
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const clients = await clockifyRequest(`/workspaces/${targetWorkspaceId}/clients`);

        return formatJsonResponse(
            clients.map((client: ClockifyClient) => ({
                id: client.id,
                name: client.name,
                address: client.address,
                email: client.email,
                note: client.note,
                archived: client.archived,
                currencyCode: client.currencyCode,
                currencyId: client.currencyId,
            }))
        );
    }
);

// Tool: Get projects on workspace
server.registerTool(
    'get_projects_on_workspace',
    {
        title: 'Get Projects on Workspace',
        description:
            'Get all projects on a workspace (defaults to active workspace if not specified)',
        inputSchema: {
            workspaceId: z
                .string()
                .optional()
                .describe(
                    'The ID of the workspace to get projects from (optional, defaults to active workspace)'
                ),
        },
    },
    async ({ workspaceId }) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user');
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const projects = await clockifyRequest(`/workspaces/${targetWorkspaceId}/projects`);

        return formatJsonResponse(
            projects.map((project: ClockifyProject) => ({
                id: project.id,
                name: project.name,
                note: project.note,
                public: project.public,
                duration: project.duration,
                color: project.color,
                memberships: project.memberships,
            }))
        );
    }
);

// Tool: Get tasks on project
server.registerTool(
    'get_tasks_on_project',
    {
        title: 'Get Tasks on Project',
        description: 'Get all tasks on a project',
        inputSchema: {
            workspaceId: z
                .string()
                .optional()
                .describe('The ID of the workspace (optional, defaults to active workspace)'),
            projectId: z.string().describe('The ID of the project to get tasks from'),
        },
    },
    async ({ workspaceId, projectId }) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user');
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const tasks = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/projects/${projectId}/tasks`
        );

        return formatJsonResponse(
            tasks.map((task: ClockifyTask) => ({
                id: task.id,
                name: task.name,
                status: task.status,
                duration: task.duration,
                assigneeId: task.assigneeId,
                assigneeIds: task.assigneeIds,
                billable: task.billable,
                budgetEstimate: task.budgetEstimate,
                costRate: task.costRate,
                estimate: task.estimate,
                hourlyRate: task.hourlyRate,
                projectId: task.projectId,
                userGroupIds: task.userGroupIds,
            }))
        );
    }
);

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
    async ({ workspaceId, userId, start, end }) => {
        let targetWorkspaceId = workspaceId;
        let targetUserId = userId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user');
            targetWorkspaceId = currentUser.activeWorkspace;
            if (!targetUserId) {
                targetUserId = currentUser.id;
            }
        }

        let endpoint = `/workspaces/${targetWorkspaceId}/user/${targetUserId}/time-entries`;
        const queryParams = [];
        if (start) queryParams.push(`start=${encodeURIComponent(start)}`);
        if (end) queryParams.push(`end=${encodeURIComponent(end)}`);
        if (queryParams.length > 0) {
            endpoint += `?${queryParams.join('&')}`;
        }

        const timeEntries = await clockifyRequest(endpoint);

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
            projectId: z.string().describe('The ID of the project to get tasks from'),
            description: z.string().describe('Description of the time entry'),
            start: z.string().describe('Start date (ISO 8601 format)'),
            end: z.string().describe('End date (ISO 8601 format)'),
            taskId: z.string().describe('The ID of the task'),
            tagIds: z.string().array().optional().describe('Array of tag IDs'),
        },
    },
    async ({ workspaceId, projectId, description, start, end, taskId, tagIds }) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user');
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const entry = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/time-entries`,
            'POST',
            {
                description,
                start,
                end,
                taskId,
                tagIds,
                projectId,
            }
        );

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
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Clockify MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
