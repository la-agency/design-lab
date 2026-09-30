# Studio UI components

Use shadcn/ui for standard controls throughout the studio. The checked-in Button, Input, and Select source lives in `studio/ui/`, sourced from the official [New York registry](https://ui.shadcn.com/r/styles/new-york-v4/select.json). The upstream MIT license is retained beside it. This is editable shadcn source with Radix behavior, not a CSS imitation of native selects.

For canvas dimensions, use `DragNumberInput`, composed from the shared Input. Drag left/right to decrease/increase by one unit per viewport pixel, independent of canvas zoom; release applies one undoable change. Click to type, then Enter or Apply to commit. Escape cancels an active drag. Keep native number validation and keyboard access, but hide spinner arrows.

Import components through relative paths inside the framework. `components.json` configures future shadcn additions; after adding a component, replace generated `@/` imports with relative framework imports so packaged consumers resolve them. Use named functions and type-only imports. Reuse existing primitives before adding another one. Action links can use `Button asChild`; route navigation remains semantic Next links. The native canvas dialog stays in place because fullscreen boards use the browser top layer and existing canvas/history APIs. New ordinary modals should use shadcn Dialog.

## Styling

`studio/globals.css` loads Tailwind v4 utilities, animation utilities, and neutral shadcn theme tokens. It explicitly scans the adjacent framework source with `@source "./"`, including when installed as a package. It deliberately retains the starter's base styles instead of applying Tailwind Preflight to every design preview.

Dark tokens and the Tailwind dark variant follow the shell's `data-studio-shell` / `data-theme` attributes. Tokens are set on the document root so Radix content portaled to `document.body` has the same theme. Select menus use a body portal and popper positioning to escape the canvas's clipped, transformed containers. Avoid CSS selectors such as `.toolbar button` that override all control appearance; use component variants and classes, leaving layout geometry in CSS Modules.

Select triggers need an accessible label. Options need stable non-empty values; `new-group` is the group picker's action sentinel, and row indexes distinguish same-named groups. Canvas shortcuts must yield to comboboxes, listboxes, and events already handled by Radix. Verify Space/Enter opening, arrow navigation, Escape dismissal, typeahead, focus restoration, and new-group input focus. Test menus at different canvas zooms, both themes, and near clipped canvas edges.

## Pinned consumers

The host needs `tailwindcss` and `@tailwindcss/postcss` dev dependencies compatible with the starter and a `postcss.config.mjs` enabling `@tailwindcss/postcss`. Keep importing `@la-agent/design-lab/globals.css` from the host root layout. The framework declares its own runtime dependencies, including Radix and animation CSS. No host-specific `@/` alias or extra Tailwind source path is required for packaged framework components.

When adopting a revision that introduces or changes this pipeline, update the host config and lockfile deliberately, verify a frozen install, and test a packed candidate in a separate consuming app. Check the open menu visually in that app; successful typechecking cannot prove utility CSS was generated.
