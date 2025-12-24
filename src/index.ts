#!/usr/bin/env node

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {ClockifyClient, ClockifyProject, ClockifyTask, ClockifyUser, ClockifyWorkspace} from './types/clockify.js';

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';
const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;
const JSON_INDENT_SPACES = 2

if (!CLOCKIFY_API_KEY) {
    console.error('Error: CLOCKIFY_API_KEY environment variable is required');
    process.exit(1);
}

const server = new McpServer({
    name: 'clockify-server',
    version: '0.0.1',
});

async function clockifyRequest(endpoint: string, apiKey: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${CLOCKIFY_API_BASE}${endpoint}`, {
        method,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `Clockify API error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.text();
            if (errorBody) {
                errorMessage += ` - ${errorBody}`;
            }
        } catch {
            // Ignore error when reading response body fails
        }
        throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    return null;
}

// Tool: Get current user
server.registerTool(
    'get_current_user',
    {
        title: 'Get Current User',
        description: 'Get information about the currently authenticated Clockify user',
        inputSchema: {},
    },
    async () => {
        const user = await clockifyRequest('/user', CLOCKIFY_API_KEY);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            activeWorkspace: user.activeWorkspace,
                            profilePicture: user.profilePicture,
                            memberships: user.memberships,
                        },
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
    }
);

// Tool: Get workspace users
server.registerTool(
    'get_workspace_users',
    {
        title: 'Get Workspace Users',
        description: 'Get all users in a workspace (defaults to active workspace if not specified)',
        inputSchema: {
            workspaceId: z
                .string()
                .optional()
                .describe(
                    'The ID of the workspace to get users from (optional, defaults to active workspace)'
                ),
        },
    },
    async ({workspaceId}) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const users = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/users`,
            CLOCKIFY_API_KEY
        );

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        users.map((u: ClockifyUser) => ({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            status: u.status,
                            activeWorkspace: u.activeWorkspace,
                            profilePicture: u.profilePicture,
                            memberships: u.memberships,
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
    }
);

// Tool: Get workspaces
server.registerTool(
    'get_workspaces',
    {
        title: 'Get Workspaces',
        description: 'Get all available workspaces for the authenticated user',
        inputSchema: {},
    },
    async () => {
        const workspaces = await clockifyRequest('/workspaces', CLOCKIFY_API_KEY);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        workspaces.map((ws: ClockifyWorkspace) => ({
                            id: ws.id,
                            name: ws.name,
                            imageUrl: ws.imageUrl,
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
    async ({workspaceId}) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const clients = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/clients`,
            CLOCKIFY_API_KEY
        );
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        clients.map((client: ClockifyClient) => ({
                            id: client.id,
                            name: client.name,
                            address: client.address,
                            email: client.email,
                            note: client.note,
                            archived: client.archived,
                            currencyCode: client.currencyCode,
                            currencyId: client.currencyId,
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
    async ({workspaceId}) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const projects = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/projects`,
            CLOCKIFY_API_KEY
        );
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        projects.map((project: ClockifyProject) => ({
                            id: project.id,
                            name: project.name,
                            note: project.note,
                            public: project.public,
                            duration: project.duration,
                            color: project.color,
                            memberships: project.memberships,
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
    async ({workspaceId, projectId}) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const tasks = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/projects/${projectId}/tasks`,
            CLOCKIFY_API_KEY
        );
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
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
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
    async ({workspaceId, userId, start, end}) => {
        let targetWorkspaceId = workspaceId;
        let targetUserId = userId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
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

        const timeEntries = await clockifyRequest(endpoint, CLOCKIFY_API_KEY);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        timeEntries.map((entry: any) => ({
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
                        })),
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
    async ({workspaceId, projectId, description, start, end, taskId, tagIds}) => {
        let targetWorkspaceId = workspaceId;

        if (!targetWorkspaceId) {
            const currentUser = await clockifyRequest('/user', CLOCKIFY_API_KEY);
            targetWorkspaceId = currentUser.activeWorkspace;
        }

        const entry = await clockifyRequest(
            `/workspaces/${targetWorkspaceId}/time-entries`,
            CLOCKIFY_API_KEY,
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
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        {
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
                        },
                        null,
                        JSON_INDENT_SPACES
                    ),
                },
            ],
        };
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
