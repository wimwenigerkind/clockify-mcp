#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CLOCKIFY_API_BASE = 'https://api.clockify.me/api/v1';
const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;

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
                        2
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
    async ({ workspaceId }) => {
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        users.map((u: any) => ({
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            status: u.status,
                            activeWorkspace: u.activeWorkspace,
                            profilePicture: u.profilePicture,
                            memberships: u.memberships,
                        })),
                        null,
                        2
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        workspaces.map((ws: any) => ({
                            id: ws.id,
                            name: ws.name,
                            imageUrl: ws.imageUrl,
                        })),
                        null,
                        2
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
    async ({ workspaceId }) => {
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        clients.map((client: any) => ({
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
                        2
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
    async ({ workspaceId }) => {
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        projects.map((project: any) => ({
                            id: project.id,
                            name: project.name,
                            note: project.note,
                            public: project.public,
                            duration: project.duration,
                            color: project.color,
                            memberships: project.memberships,
                        })),
                        null,
                        2
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
