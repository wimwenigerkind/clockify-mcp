import {CLOCKIFY_API_BASE_URL, CLOCKIFY_API_KEY} from '../index.js';

export async function clockifyRequest(endpoint: string, method = 'GET', body?: unknown) {
    if (!CLOCKIFY_API_KEY) {
        throw new Error('CLOCKIFY_API_KEY is not configured');
    }

    const response = await fetch(`${CLOCKIFY_API_BASE_URL}${endpoint}`, {
        method,
        headers: {
            'X-Api-Key': CLOCKIFY_API_KEY,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let errorMessage = `Clockify API error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.text();
            if (errorBody) {
                errorMessage += ` - ${errorBody}`;
            }
        } catch {
            // Ignore error when reading response body fails
        }
        throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    return null;
}
