# Basketball Drill Tracker

First slice of a shared web app for:

- creating shared drills
- creating shared players
- entering drill scores on the main page
- reviewing saved data by player or by drill

## Run locally

1. Copy `.env.example` to `.env`
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Install dependencies with `npm install`
4. Start with `npm run dev`

If the Supabase env vars are missing, the app falls back to browser local storage so the UI is still usable during development.

## Supabase setup

Run [supabase/schema.sql](./supabase/schema.sql) in your Supabase SQL editor.

This creates:

- `drills`
- `players`
- `drill_entries`

The current policies allow public read/write access so the lists and scores can be shared across devices without a login flow yet. That is acceptable for a prototype, but it should be tightened before broader production use.

## Create the Supabase project

1. Create a Supabase account and a new project in the Supabase dashboard.
2. Once the project is ready, open the SQL editor and run [supabase/schema.sql](./supabase/schema.sql).
3. Open the project's API settings and copy:
   - project URL
   - publishable/anon key
4. Put those values into your local `.env` file for development.

## Deploy to GitHub Pages

This app uses `HashRouter`, so it is safe to host on GitHub Pages without custom rewrite rules.

1. Create a GitHub repository and push this app to its `main` branch.
2. In the GitHub repository settings, enable GitHub Pages with the source set to `GitHub Actions`.
3. In the repository secrets, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. The workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) will build and deploy the app on every push to `main`.
