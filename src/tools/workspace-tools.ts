import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {ClockifyService} from '../api/clockify-service.js';
import {ClockifyUser, ClockifyWorkspace} from '../types/clockify.js';
import {formatJsonResponse} from "../utils/response-formatters.js";

const clockifyService = new ClockifyService();

export function registerWorkspaceTools(server: McpServer) {
    // Tool: Get Workspace
    server.registerTool(
        'get_workspace',
        {
            title: 'Get Workspace',
            description: 'Get Workspace by Id',
            inputSchema: {
                workspaceId: z
                    .string()
                    .optional()
                    .describe(
                        'The ID of the workspace to get (optional, defaults to active workspace)'
                    ),
            },
        },
        async ({workspaceId}) => {
            try {
                const workspace = workspaceId
                    ? await clockifyService.getWorkspace(workspaceId)
                    : await clockifyService.getActiveWorkspace();

                return formatJsonResponse({
                    id: workspace.id,
                    name: workspace.name,
                    imageUrl: workspace.imageUrl,
                });
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );

    // Tool: Get Workspaces
    server.registerTool(
        'get_workspaces',
        {
            title: 'Get Workspaces',
            description: 'Get all available workspaces for the authenticated user',
            inputSchema: {},
        },
        async () => {
            try {
                const workspaces = await clockifyService.getWorkspaces();

                return formatJsonResponse(
                    workspaces.map((ws: ClockifyWorkspace) => ({
                        id: ws.id,
                        name: ws.name,
                        imageUrl: ws.imageUrl,
                    }))
                );
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );

    // Tool: Get Workspace Users
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
            try {
                const targetWorkspaceId = workspaceId ?? (await clockifyService.getActiveWorkspaceId());
                const users = await clockifyService.getWorkspaceUsers(targetWorkspaceId);

                return formatJsonResponse(
                    users.map((u: ClockifyUser) => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        status: u.status,
                        activeWorkspace: u.activeWorkspace,
                        profilePicture: u.profilePicture,
                        memberships: u.memberships,
                    }))
                );
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch workspace users: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );
}