import {clockifyRequest} from './client.js';

interface CurrentUser {
    id: string;
    activeWorkspace: string;
}

let currentUser: Promise<CurrentUser> | undefined;

/** The authenticated user (cached for the lifetime of the server). */
export function getCurrentUser(): Promise<CurrentUser> {
    currentUser ??= clockifyRequest<CurrentUser>('/user').catch((error) => {
        currentUser = undefined;
        throw error;
    });
    return currentUser;
}

export async function resolveWorkspaceId(workspaceId?: string): Promise<string> {
    return workspaceId ?? (await getCurrentUser()).activeWorkspace;
}

export async function resolveUserId(userId?: string): Promise<string> {
    return userId ?? (await getCurrentUser()).id;
}
