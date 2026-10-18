# Refactor - Planner.tsx (plan and snapshot)

Status: planned changes recorded. I will not modify Supabase integration files.

What I will do next (if you confirm):

1. Improve performance and readability in `src/components/planner/Planner.tsx`:
   - Wrap event handlers that call Supabase in `useCallback`.
   - Extract repeated inline components into small subcomponents where it reduces duplication.
   - Add defensive checks for possibly undefined data before access.
   - Improve TypeScript typings for local states and server responses.
   - Disable buttons while async operations are running and show clearer error messages.
   - Minor accessibility improvements (aria-labels on actionable icons).

2. Safety constraints (you asked these remain untouched):
   - No changes to `src/integrations/supabase/*` files.
   - Do not modify `requireSupabaseAuth` or migrations/config files.

3. Delivery
   - I will commit changes directly to `main` as you requested.
   - I will keep commits small and focused and include a summary message.

If you want me to proceed now, reply: "Proceed with Planner.tsx refactor".

(Committed this note to the repository as a checkpoint.)
