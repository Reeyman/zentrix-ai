# Production Setup Instructions

## Database Migration

The Supabase CLI requires an active, unpaused project. Since your available projects are paused, you have two options:

### Option 1: Unpause an existing project
1. Go to https://supabase.com/dashboard/project/utlregfjoquiywvearfo (Staging)
2. Go to https://supabase.com/dashboard/project/dazftycfddropthvlowt (Prod)
3. Resume the project from the dashboard
4. Run: `npx supabase link --project-ref [your-project-ref]`
5. Run: `npx supabase db push`

### Option 2: Create a new project
1. Go to https://supabase.com/dashboard/new
2. Create a new project
3. Copy the project reference ID
4. Run: `npx supabase link --project-ref [new-project-ref]`
5. Run: `npx supabase db push`

## Environment Variables

Replace the placeholders in `.env.local` with your actual credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

## Verify Setup

After configuring:
1. Run `npm run dev`
2. Visit `http://localhost:3000/api/health`
3. Should show `status: healthy` and `mode: connected`

## Current Status

✅ Code is production-ready
✅ Build passes
✅ All APIs functional in demo mode
⏳ Waiting for unpaused Supabase project to apply migrations
⏳ Waiting for real credentials to enable connected mode
