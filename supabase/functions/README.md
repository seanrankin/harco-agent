# Supabase Edge Functions

This project currently uses **Next.js Route Handlers** (`/app/api/`) for all server-side logic instead of Supabase Edge Functions.

If edge functions are added in the future, they should follow this structure:

```
supabase/functions/
├── <function-name>/
│   └── index.ts
└── README.md
```

Deploy with:

```bash
supabase functions deploy <function-name>
```
