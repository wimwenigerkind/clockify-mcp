export interface ClockifyUser {
    id: string;
    name: string;
    email: string;
    activeWorkspace: string;
    profilePicture?: string;
    memberships: unknown[];
    status?: string;
}

export interface ClockifyWorkspace {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface ClockifyClient {
    id: string;
    name: string;
    address?: string;
    email?: string;
    note?: string;
    archived: boolean;
    currencyCode?: string;
    currencyId?: string;
}

export interface ClockifyProject {
    id: string;
    name: string;
    note?: string;
    public: boolean;
    duration?: string;
    color?: string;
    memberships: unknown[];
}

export interface ClockifyTask {
    id: string;
    name: string;
    status: string;
    duration?: string;
    assigneeId?: string;
    assigneeIds?: string[];
    billable: boolean;
    budgetEstimate?: unknown;
    costRate?: unknown;
    estimate?: string;
    hourlyRate?: unknown;
    projectId: string;
    userGroupIds?: string[];
}

export interface ClockifyTimeEntry {
    id: string;
    description: string;
    projectId?: string;
    taskId?: string;
    billable: boolean;
    timeInterval: {
        start: string;
        end: string;
    };
    userId: string;
    workspaceId: string;
    tags?: string[];
    tagIds?: string[];
    costRate?: unknown;
    hourlyRate?: unknown;
    customFieldValues?: unknown[];
    isLocked: boolean;
    kioskId?: string;
    type: string;
}
