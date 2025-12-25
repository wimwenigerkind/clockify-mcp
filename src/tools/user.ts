import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {ClockifyService} from '../api/clockify-service.js';
import {formatJsonResponse} from "../utils/response-formatters.js";

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
}