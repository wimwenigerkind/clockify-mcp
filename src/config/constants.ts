export const CLOCKIFY_API_KEY = process.env.CLOCKIFY_API_KEY;
export const CLOCKIFY_API_BASE_URL = (process.env.CLOCKIFY_API_BASE_URL ??
    'https://api.clockify.me/api/v1') as string;
export const JSON_INDENT_SPACES = 2;

if (!CLOCKIFY_API_KEY) {
    console.error('Error: CLOCKIFY_API_KEY environment variable is required');
    process.exit(1);
}