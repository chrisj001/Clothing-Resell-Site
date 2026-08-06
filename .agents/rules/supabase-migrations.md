## Supabase Migrations

When providing Supabase SQL migrations or database changes for the user to execute manually in their Supabase Dashboard:
1. Write the raw SQL directly into a new `.sql` file inside the `supabase/migrations/` directory.
2. Provide the exact raw SQL snippet in your response or walkthrough artifact so the user can easily copy and paste it.
3. **NEVER** create Javascript/Node.js scratch scripts (e.g., `run_migration.js`) in an attempt to run the migration programmatically yourself. Users can see these generated files and may mistakenly copy the Javascript code into the SQL editor, causing syntax errors.
