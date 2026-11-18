import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z, ZodRawShape} from 'zod';
import {JSON_INDENT_SPACES} from '../config/constants.js';
import {resolveUserId, resolveWorkspaceId} from '../api/context.js';

export const workspaceIdSchema = z
    .string()
    .optional()
    .describe('The ID of the workspace (optional, defaults to active workspace)');

export const userIdSchema = z
    .string()
    .optional()
    .describe('The ID of the user (optional, defaults to the authenticated user)');

export const rateSchema = {
    amount: z.number().int().min(0).describe('Rate amount in the smallest currency unit (cents)'),
    since: z
        .string()
        .optional()
        .describe('Date-time (ISO 8601) from which the rate applies, e.g. 2024-01-01T00:00:00Z'),
};

export const pageSchema = {
    page: z.number().int().min(1).optional().describe('Page number (default 1)'),
    'page-size': z.number().int().min(1).max(1000).optional().describe('Items per page'),
};

interface ToolDefinition<Shape extends ZodRawShape> {
    name: string;
    title: string;
    description: string;
    inputSchema: Shape;
    /** Used as prefix for error messages, e.g. "fetch projects". */
    action: string;
    handler: (
        args: z.infer<z.ZodObject<Shape>>,
        helpers: {
            workspaceId: () => Promise<string>;
            userId: () => Promise<string>;
        }
    ) => Promise<unknown>;
}

export function formatJsonResponse(data: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(data ?? {success: true}, null, JSON_INDENT_SPACES),
            },
        ],
    };
}

export function formatErrorResponse(action: string, error: unknown) {
    return {
        isError: true,
        content: [
            {
                type: 'text' as const,
                text: `Failed to ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
        ],
    };
}

/**
 * Registers a tool whose handler returns plain data. Error handling, JSON formatting and
 * workspace/user default resolution are handled here.
 *
 * `args.workspaceId` / `args.userId` are used if the input schema declares them.
 */
export function defineTool<Shape extends ZodRawShape>(
    server: McpServer,
    definition: ToolDefinition<Shape>
) {
    const {name, title, description, inputSchema, action, handler} = definition;
    server.registerTool(name, {title, description, inputSchema}, (async (
        args: z.infer<z.ZodObject<Shape>>
    ) => {
        try {
            const result = await handler(args, {
                workspaceId: () => resolveWorkspaceId((args as {workspaceId?: string}).workspaceId),
                userId: () => resolveUserId((args as {userId?: string}).userId),
            });
            return formatJsonResponse(result);
        } catch (error) {
            return formatErrorResponse(action, error);
        }
    }) as never);
}
