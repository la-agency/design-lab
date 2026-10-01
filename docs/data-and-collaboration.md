# Data and collaboration guide

Design Lab keeps design source in Git and working review data in a local SQLite database. The browser and agent commands use the same application API, validation and conflict rules. The earlier launch-specific implementation has been rolled back; the studio currently supports web and email designs.

## Where things live

| Information | Location |
| --- | --- |
| Components, design manifests, briefs and brand guidance | `designs/` and `brand/`, versioned in Git |
| Images and other media | `public/` or referenced asset hosting |
| Favorites, layouts, feedback, collections and change history | `.studio/workspace.sqlite` |
| Original favorites and layouts from before migration | `.studio/decisions.json` and `.studio/layouts.json`, retained unchanged |
| Tabs and theme | Browser local storage |
| Undo and interactive demo state | Browser session |

The database is ignored by Git. On the first development request, existing JSON is validated and imported in one transaction. Invalid input aborts the import. Original values are also retained in database metadata. Import happens once; subsequent JSON edits are not applied. Do not keep editing those legacy files as a second source of truth.

Run `pnpm dev` with Node 22.14+ within Node 22. Storage uses Node's built-in `node:sqlite`; this API emits an experimental warning on the supported Node runtime. No separate database installation or service is needed. Run one development server per checkout. SQLite coordinates database connections, but this does not make concurrent Next development servers or source-file writers safe.

## Review a design

Use **Feedback** in the canvas sidebar, choose a board and add a comment. For an element-specific comment, use **Copy element context**, select the element, then **Add feedback**. The stored context includes the board, source path, preview revision, selector and selected text. Replies and resolution are recorded in history. Feedback whose preview revision changed is marked as outdated; it is not silently reassigned to another element. The revision tracks the generated design preview, not every imported dependency or a pixel-perfect screenshot.

Native browser annotations still send context to your chat. They are separate from saved feedback; Design Lab does not intercept your chat or automatically copy native annotations into the database.

Use **Collections** to create a named shortlist, add or remove boards, rename it, reorder its members or archive it. Archived collections can be restored. Collections are shared within the local workspace and are independent of canvas rows and board positions. A board can belong to several collections. Stars remain favorites; neither stars nor collection membership implies approval.

**History** shows recorded changes and offers **Export data**. Export includes all profiles, feedback, collection state and before/after history; treat it as workspace data. The panel refreshes periodically and on focus without resetting unfinished comment or rename text.

## What happens when edits overlap

Every successful write records an actor, time and revision in the same transaction as the data change. A request ID makes retrying the same command safe. Reusing an ID with different content is rejected.

| Concurrent actions | Behavior |
| --- | --- |
| Favorite different boards | Both save |
| Set the same favorite from an old revision | The stale save is rejected; the UI loads the latest value |
| Move or resize different boards | Independent changes merge |
| Change the same board geometry | Conflicting changes are rejected |
| Change the same group list or canvas color | Competing changes are rejected |
| Add feedback or replies | Independent entries are retained |
| Resolve/reopen a thread or rename/reorder a collection | The expected revision must still match |
| Add/remove collection members | Each intent applies to the current membership; other members are preserved |

On a layout conflict, your unsaved layout remains on screen and further automatic saves stop. **Download my layout** preserves it as JSON; **Load saved layout** deliberately replaces the local view with the current stored layout. Loading a merged or saved layout starts fresh canvas undo history. Unrelated local edits keep normal undo/redo.

Membership commands are explicit “present” or “absent” intents. Competing intents for the same member are processed in transaction order; this is distinct from revision-guarded collection ordering. Group changes are guarded as one list rather than merged by group name.

## Agent access

Run from the studio directory. In this source checkout, use `node bin/design-lab.mjs`; in a pinned consumer, use `pnpm exec design-lab` instead.

```sh
node bin/design-lab.mjs data get
node bin/design-lab.mjs data get --file landing-page
node bin/design-lab.mjs data export --output /tmp/design-lab-review.json
node bin/design-lab.mjs data backup /tmp/design-lab-backup.sqlite
```

Reads, exports and edits use the running local API. Add `--url http://127.0.0.1:4214` for a different port. Backup operates directly on the local database and can run while the studio is open. Output/backup commands refuse to overwrite an existing file.

To add feedback, put the command in a JSON file:

```json
{
  "type": "feedback.add",
  "fileId": "landing-page",
  "boardId": "landing-page-v1",
  "body": "Review the heading spacing."
}
```

Then send it with an explicit actor and unique request ID:

```sh
node bin/design-lab.mjs data write /tmp/feedback.json \
  --actor design-agent --request-id feedback-heading-001
```

Reuse that exact ID and file when retrying an uncertain result. Use a new ID for a new intent. HTTP 409 means the command conflicts; read the latest entity and review it before issuing a revised command. Agents should write through these commands, not direct SQL. Read-only SQL inspection is also possible.

Supported command shapes:

| Type | Required fields beyond `type` |
| --- | --- |
| `feedback.add` | `fileId`, `boardId`, `body`; optional `selector`, `selectedText`, `sourceRevision` |
| `feedback.reply` | `id` (thread), `body` |
| `feedback.resolve` | `id`, `revision`, `resolved` |
| `collection.create` | `fileId`, `name` |
| `collection.rename` | `id`, `revision`, `name` |
| `collection.archive` | `id`, `revision`, `archived` |
| `collection.member` | `id`, `boardId`, `present` |
| `collection.order` | `id`, `revision`, `boardIds` containing every member exactly once |
| `favorite.set` | `fileId`, `pageId`, `boardId`, `title`, `source` (design route), `favorite`, `revision` |
| `layout.save` | `fileId`, `pageId`, `revision`, `base`, `layout` |

`data get` returns entities with IDs, revisions and values. New favorites use revision 0. For layouts, `base` is the layout before the local edit and `layout` is the proposed layout, each containing `colour`, `sizes`, `groups`, and `offsets`. Use the stored revision returned by the API. Do not invent revisions or quietly retry a conflict against a newer one.

The browser uses the `local` profile for favorites/layouts. Agent commands default to that profile and can select another with `--profile <slug>`. Feedback and collections are workspace-wide. Actors and profiles are local attribution labels, not authenticated user identities or access-control boundaries.

## Backup and recovery

The database owns current review history; Git still owns design source history. Back up both. `data backup` uses SQLite's consistent [VACUUM INTO snapshot](https://sqlite.org/lang_vacuum.html), including data, history, migration metadata and retry receipts. Do not copy only a live `.sqlite` file while ignoring its WAL sidecar.

To restore, stop the development server and all database clients. Move the existing database and any `-wal`/`-shm` files into a recovery directory; retain them until the restore is verified. Copy the backup into `.studio/workspace.sqlite`, then restart. Verify favorites, layouts, feedback and collections before deleting any recovery copy. Restoring an older backup intentionally returns review data to that point; source files are unaffected.

JSON export is for inspection and interchange, not a database backup or automatic import. There is no JSON import command. A production build can read an existing database in read-only mode. If no database accompanies the build, it falls back to legacy JSON without creating a database on disk; it will not contain newer database-only review data. Production writes remain disabled.

## Two people on separate machines

This release coordinates tabs and agents using one local workspace. Separate checkouts have separate databases. SQLite itself does not synchronize them, and a local URL does not share your workspace.

Live collaboration across machines needs one authenticated shared service with workspace permissions, accessible source versions and durable backups. A small single-server service could use SQLite on its local disk; a service needing multiple application instances should use a client/server database behind the same domain commands. Do not share the live SQLite file through Git, Dropbox or a network drive. See SQLite's [deployment guidance](https://sqlite.org/whentouse.html).

That remote service, authenticated reviewer identities and offline synchronization are not implemented. Local origin checks remain enabled. Direct source edits still need Git coordination.

## Future launch support

The launch editor, dedicated launch kind, initializer and channel renderers were removed at the user's request. A future implementation should build on this storage layer: reusable template definitions in Git, draft fields and review history in the database, approvals tied to exact content/asset revisions, and immutable release snapshots. All channel layouts should read the same record. Real media stays explicit and versioned; missing screenshots and demos remain blockers. Approval must require user sign-off, and account records must contain references rather than credentials.

The current database provides generic review storage, not launch drafts, approval enforcement or release publishing. Reintroduce those features deliberately rather than restoring the old JSON launch implementation.
