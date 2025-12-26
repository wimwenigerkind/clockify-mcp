import {JSON_INDENT_SPACES} from "../config/constants.js";

export function formatJsonResponse(data: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(data, null, JSON_INDENT_SPACES),
            },
        ],
    };
}
