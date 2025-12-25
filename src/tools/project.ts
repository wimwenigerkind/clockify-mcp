import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {ClockifyService} from '../api/clockify-service.js';
import {formatJsonResponse} from "../utils/response-formatters.js";
import {z} from "zod";
import {ClockifyProject, ClockifyTask} from "../types/clockify.js";

const clockifyService = new ClockifyService();

export function registerProjectTools(server: McpServer) {
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
            try {
                const targetWorkspaceId = workspaceId ?? (await clockifyService.getActiveWorkspaceId());
                const projects = await clockifyService.getWorkspaceProjects(targetWorkspaceId);

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
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch projects on workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
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
            try {
                const targetWorkspaceId = workspaceId ?? (await clockifyService.getActiveWorkspaceId());
                const tasks = await clockifyService.getProjectTasks(targetWorkspaceId, projectId);

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
            } catch (error) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: `Failed to fetch tasks on project: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );
}