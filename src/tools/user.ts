import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {ClockifyService} from '../api/clockify-service.js';
import {formatJsonResponse} from "../utils/response-formatters.js";
import {ClockifyUser} from "../types/clockify.js";

const clockifyService = new ClockifyService();

export function registerUserTools(server: McpServer) {
    // Tool: Get current user
    server.registerTool(
        'get_current_user',
        {
            title: 'Get Current User',
            description: 'Get information about the currently authenticated Clockify user',
            inputSchema: {},
        },
        async () => {
            try {
                const user = await clockifyService.getCurrentUser();

                return formatJsonResponse({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    activeWorkspace: user.activeWorkspace,
                    profilePicture: user.profilePicture,
                    memberships: user.memberships,
                });
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch current user: ${error instanceof Error ? error.message : 'Unknown error'}`,
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