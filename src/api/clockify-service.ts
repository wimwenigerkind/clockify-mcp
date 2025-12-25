import {ClockifyClient, ClockifyUser, ClockifyWorkspace} from "../types/clockify.js";
import {clockifyRequest} from "./client.js";

export class ClockifyService {
    async getCurrentUser(): Promise<ClockifyUser> {
        return clockifyRequest('/user');
    }

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

    async getWorkspaceClients(workspaceId: string): Promise<ClockifyClient[]> {
        return clockifyRequest(`/workspaces/${workspaceId}/clients`);
    }
}