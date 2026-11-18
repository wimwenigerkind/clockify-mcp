import {CLOCKIFY_API_BASE_URL, CLOCKIFY_API_KEY} from '../config/constants.js';

export type QueryValue = string | number | boolean | undefined | null | (string | number)[];

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    query?: Record<string, QueryValue>;
    body?: unknown;
    /** Overrides the base URL, e.g. for the reports API. */
    baseUrl?: string;
}

export function buildQueryString(query: Record<string, QueryValue> = {}): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        for (const item of Array.isArray(value) ? value : [value]) {
            params.append(key, String(item));
        }
    }
    const result = params.toString();
    return result ? `?${result}` : '';
}

/** Calls the Clockify API and returns the parsed JSON body (or null for empty responses). */
export async function clockifyRequest<T = unknown>(
    path: string,
    {method = 'GET', query, body, baseUrl = CLOCKIFY_API_BASE_URL}: RequestOptions = {}
): Promise<T> {
    const response = await fetch(`${baseUrl}${path}${buildQueryString(query)}`, {
        method,
        headers: {
            'X-Api-Key': CLOCKIFY_API_KEY as string,
            'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(
            `Clockify API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
        );
    }

    return (text ? JSON.parse(text) : null) as T;
}
