# clockify-mcp

An [MCP](https://modelcontextprotocol.io) server for [Clockify](https://clockify.me). It exposes the Clockify REST and Reports APIs as tools, so an MCP client such as Claude can read and manage time entries, projects, invoices, reports and more.

## Setup

Requires [Bun](https://bun.sh) and [Task](https://taskfile.dev) for development and Node.js to run the server.

```sh
task install
task build
```

Generate an API key in your Clockify profile settings.

## Configuration

| Variable                    | Required | Default                              |
| --------------------------- | -------- | ------------------------------------ |
| `CLOCKIFY_API_KEY`          | yes      |                                      |
| `CLOCKIFY_API_BASE_URL`     | no       | `https://api.clockify.me/api/v1`     |
| `CLOCKIFY_REPORTS_BASE_URL` | no       | `https://reports.api.clockify.me/v1` |

The base URLs only need to change for a regional or self-hosted Clockify instance.

## Usage

The server speaks MCP over stdio. Add it to your client, for example in Claude Desktop's `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "clockify": {
            "command": "node",
            "args": ["/path/to/clockify-mcp/build/index.js"],
            "env": {
                "CLOCKIFY_API_KEY": "your-api-key"
            }
        }
    }
}
```

Or in Claude Code:

```sh
claude mcp add clockify -e CLOCKIFY_API_KEY=your-api-key -- node /path/to/clockify-mcp/build/index.js
```

Most tools take an optional `workspaceId` and `userId`. When they are left out, the server uses the active workspace and the user the API key belongs to.

## Tools

| Area           | Covers                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| Workspaces     | list, create, hourly and cost rates                                           |
| Users          | current user, profiles, workspace members, status, roles, managers, rates     |
| User groups    | list, create, update, delete, membership                                      |
| Clients        | list, create, update, delete                                                  |
| Projects       | list, create from scratch or template, memberships, rates, estimates          |
| Tasks          | list, create, update, delete, rates                                           |
| Tags           | list, create, update, delete                                                  |
| Time entries   | list, create, update, delete, duplicate, bulk edit, stop timer, mark invoiced |
| Expenses       | expenses and expense categories                                               |
| Invoices       | invoices, items, payments, status, export, settings                           |
| Templates      | timesheet templates                                                           |
| Entity changes | created, updated and deleted entities                                         |
| Reports        | summary, detailed, weekly, attendance, expense, audit log, shared reports     |
| Approvals      | approval requests, submit and resubmit                                        |
| Webhooks       | webhooks, add-on webhooks, logs, tokens                                       |
| Custom fields  | workspace, project and user custom fields                                     |
| Scheduling     | assignments and scheduled totals                                              |
| Holidays       | list, create, update, delete                                                  |
| Time off       | policies, requests, balances, balance assignments                             |

Run `task inspector` to browse all tools and their parameters in the MCP Inspector.

## Development

Tasks are defined in `Taskfile.yaml` and run with [Task](https://taskfile.dev):

| Task             | Description                                    |
| ---------------- | ---------------------------------------------- |
| `task install`   | Install dependencies                           |
| `task build`     | Build to `build/`                              |
| `task lint`      | Run ESLint                                     |
| `task format`    | Format code with Prettier                      |
| `task test`      | Build, lint, check formatting and licenses     |
| `task inspector` | Run the MCP Inspector against the built server |

`task --list` shows all tasks.

## License

[MIT](LICENSE)
