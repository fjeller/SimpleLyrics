# How to change the database schema

Schema changes are made with Drizzle ORM and applied to a `.sng` file through SQL migrations in `drizzle/`.

## Steps

1. Edit the table definitions in [src/main/db/schema.ts](../src/main/db/schema.ts).
2. If you change a limit, change it in `LIMITS` in [src/shared/types.ts](../src/shared/types.ts). The schema checks and the zod validation both use this constant.
3. Generate the migration:

   ```powershell
   npm run db:generate
   ```

   A new `.sql` file and an updated snapshot appear in `drizzle/` (see [drizzle.config.ts](../drizzle.config.ts)).
4. Review the generated SQL. Commit the SQL file together with the files in `drizzle/meta/`.
5. Update the affected repositories in `src/main/repositories/`, the DTOs in `src/shared/types.ts` and the zod schemas in `src/main/ipc/validation.ts`.
6. Run the checks:

   ```powershell
   npm run typecheck
   npm test
   ```

## Notes

- Never edit an existing migration that was already used on a user's file. Add a new one.
- The packaged app ships the `drizzle/` folder as an extra resource, so new migrations are included automatically.
- Case-insensitive unique names are enforced twice: by a unique index with `COLLATE NOCASE` (ASCII only) and by a Unicode-aware check in JavaScript. Keep both when adding similar fields. See [Design decisions and gotchas](explanation-design-decisions.md).
- Do not enable WAL mode. See the same document for the reason.

## See also

- [Data model and limits](reference-data-model-and-limits.md)
