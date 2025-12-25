import {
    ClockifyClient,
    ClockifyProject,
    ClockifyTask,
    ClockifyTimeEntry,
    ClockifyUser,
    ClockifyWorkspace,
} from '../types/clockify.js';
import {clockifyRequest} from './client.js';

export class ClockifyService {
    // User methods
    async getCurrentUser(): Promise<ClockifyUser> {
        return clockifyRequest('/user');
    }

    async getUserProfile(workspaceId: string, userId: string): Promise<ClockifyUser> {
        return clockifyRequest(`/workspaces/${workspaceId}/member-profile/${userId}`);
    }

    // Workspace methods
    async getWorkspace(workspaceId: string): Promise<ClockifyWorkspace> {
        return clockifyRequest(`/workspaces/${workspaceId}`);
    }

    async getActiveWorkspace(): Promise<ClockifyWorkspace> {
        const currentUser = await this.getCurrentUser();
        return this.getWorkspace(currentUser.activeWorkspace);
    }

    async getActiveWorkspaceId(): Promise<string> {
        const currentUser = await this.getCurrentUser();
        return currentUser.activeWorkspace;
    }

    async getWorkspaces(): Promise<ClockifyWorkspace[]> {
        return clockifyRequest('/workspaces');
    }

    async getWorkspaceUsers(workspaceId: string): Promise<ClockifyUser[]> {
        return clockifyRequest(`/workspaces/${workspaceId}/users`);
    }

    // Client methods
    async getWorkspaceClients(workspaceId: string): Promise<ClockifyClient[]> {
        return clockifyRequest(`/workspaces/${workspaceId}/clients`);
    }

    // Project methods
    async getWorkspaceProjects(workspaceId: string): Promise<ClockifyProject[]> {
        return clockifyRequest(`/workspaces/${workspaceId}/projects`);
    }

    async getProjectTasks(workspaceId: string, projectId: string): Promise<ClockifyTask[]> {
        return clockifyRequest(`/workspaces/${workspaceId}/projects/${projectId}/tasks`);
    }

    // Time entry methods
    async getUserTimeEntries(
        workspaceId: string,
        userId: string,
        queryString: string = ''
    ): Promise<ClockifyTimeEntry[]> {
        const endpoint = `/workspaces/${workspaceId}/user/${userId}/time-entries${queryString}`;
        return clockifyRequest(endpoint);
    }

    async addTimeEntry(
        workspaceId: string,
        entry: {
            description: string;
            start: string;
            end: string;
            projectId: string;
            taskId?: string;
            tagIds?: string[];
        }
    ): Promise<ClockifyTimeEntry> {
        return clockifyRequest(`/workspaces/${workspaceId}/time-entries`, 'POST', entry);
    }

    async duplicateTimeEntry(
        workspaceId: string,
        userId: string,
        id: string
    ): Promise<ClockifyTimeEntry> {
        return clockifyRequest(
            `/workspaces/${workspaceId}/user/${userId}/time-entries/${id}/duplicate`,
            'POST'
        );
    }
}
