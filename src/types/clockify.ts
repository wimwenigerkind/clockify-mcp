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