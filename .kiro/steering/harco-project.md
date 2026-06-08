# Harco Agent Project Rules

## Database Changes

- All database changes must go through spec mode (requirements > design > tasks).
- Always create a local migration file in `supabase/migrations/` alongside applying changes via MCP.
- Never modify existing migration files. Always add new ones.
- Sean pushes changes to git. Don't commit without asking.

## Project Context

- Supabase project: harco-agent (ref: igdfkqwspsncqpckbhti, region: us-west-2)
- Node version: 22 (via nvm, pinned in .nvmrc)
- Hosting: Vercel (Next.js) + Supabase (hosted, no local dev)
- All Supabase work is remote only. No `supabase init`, no local containers.
