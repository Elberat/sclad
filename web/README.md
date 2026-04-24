# Sclad Web

## Env modes

The app reads frontend Supabase config from Vite env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV` optional marker for the current target

Recommended local setup:

1. Create `web/.env.development.local` from `web/.env.development.example`
2. Create `web/.env.production.local` from `web/.env.production.example`
3. Put your dev Supabase project in the development file
4. Put your prod Supabase project in the production file

`*.local` files are ignored by git, so personal credentials stay local.

## Commands

- `npm run dev` or `npm run dev:dev` starts Vite against the dev env
- `npm run dev:prod` starts Vite against the prod env
- `npm run build` or `npm run build:prod` builds with the prod env
- `npm run build:dev` builds with the dev env
- `npm run preview:prod` previews a prod build
- `npm run preview:dev` previews a dev build

## Notes

- Do not put `SUPABASE_SERVICE_ROLE_KEY` into frontend env files
- Only `VITE_*` variables are exposed to the browser bundle
