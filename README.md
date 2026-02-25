# mcp-supabase

Query, insert, update, and delete rows in Supabase (PostgREST) databases.

## Tools

| Tool | Description |
|------|-------------|
| `query` | Query rows from a table using PostgREST syntax. |
| `insert` | Insert rows into a table. |
| `update` | Update rows in a table. |
| `delete` | Delete rows from a table. |
| `rpc` | Call a Postgres function. |
| `list_tables` | List tables (requires service key with pg_catalog access). |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-supabase.git
cd mcp-supabase
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/path/to/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_KEY": "your-supabase-service-key",
        "SUPABASE_ANON_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

## Usage with npx

```bash
npx mcp-supabase
```

## License

MIT
