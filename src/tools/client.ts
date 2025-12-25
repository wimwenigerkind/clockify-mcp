import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {ClockifyService} from '../api/clockify-service.js';
import {formatJsonResponse} from "../utils/response-formatters.js";
import {z} from "zod";
import {ClockifyClient} from "../types/clockify.js";

const clockifyService = new ClockifyService();

export function registerClientTools(server: McpServer) {
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
            try {
                const targetWorkspaceId = workspaceId ?? (await clockifyService.getActiveWorkspaceId());
                const clients = await clockifyService.getWorkspaceClients(targetWorkspaceId);

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
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch clients on workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );
}