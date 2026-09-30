# Workspace conventions

Paths in this guide are relative to the design app directory, typically `apps/design-lab` inside your product repository. To reuse production components, first follow [shared component setup](integration.md#share-components-with-your-app). Design versions can import the same UI packages as the production app and wrap them with sample props and preview providers.

## Minimal design

Create `designs/my-email/design.json`:

```json
{ "title": "My email", "kind": "email", "width": 640 }
```

Then `designs/my-email/versions/v1.tsx`:

```tsx
import { Html, Body, Container, Heading, Text } from "@react-email/components";
export default function Email() {
  return <Html lang="en"><Body><Container><Heading>Hello, Alex</Heading><Text>Welcome aboard.</Text></Container></Body></Html>;
}
```

Use `kind: "web"` for normal React pages. Each version must default-export a component without required props. For an existing component with required props, default-export a wrapper that supplies fictional data. Keep styles/components beside the design; put directly linked assets in `public/`.

Keep experimental variants in the design folder. Editing an imported shared component changes the production app's source as well. Once a direction is chosen, implement the intended reusable change in the shared package and verify both apps. Earlier versions that import that package will reflect its new behavior; version files do not freeze imported dependencies. Git provides historical snapshots.

The terminal watcher discovers changes. Visit `/files/my-email/exploration`. Add `v2.tsx` to create a second board. Versions sort naturally (v2 before v10).

## Optional pages and results

```json
{
  "title": "Welcome email",
  "kind": "email",
  "width": 640,
  "pages": [
    { "id": "first-round", "title": "First round", "versions": ["v1", "v2"] },
    { "id": "refinements", "title": "Refinements", "versions": ["v3"] }
  ],
  "result": "v3",
  "resultStatus": "wip"
}
```

Pages and versions require unique IDs. When pages are present, every discovered version must be listed exactly once; this prevents forgotten work from silently disappearing. `result` references an existing version; `resultStatus` is `wip` or `approved`. Omitted status defaults to WIP. Result appears before Explore only when a result is declared. Stars alone do not select a result.

Widths range from 240 to 7680 pixels. Preview content determines natural height. Browser controls can override dimensions and place boards freely; those overrides persist in `.studio/layouts.json`.

## Source and saved state

Author definitions in `designs/`. Browser layout choices live in `.studio/layouts.json`, selections in `.studio/decisions.json`. Commit all three. When restoring a saved layout, new boards append horizontally to the first existing group named after the page, or the last saved row if none matches. Removed boards are ignored and existing row splits are retained. With no surviving saved boards, the page's default rows apply. Previously saved duplicate group names remain separate; the group dropdown labels them by row so boards can be moved between them. Use **Join row** on the first board of a later row to merge that entire row into the preceding one. **Reset layout** clears drag offsets without merging rows. To intentionally reset saved dimensions, close the dev server, edit only the relevant layout record, and restart. Keep backups via Git.

To share a specific candidate, copy its `/files/<id>/exploration?page=<page>#board-<id>-<version>` URL. A loopback URL works only on a machine running that workspace; send repository access and the relative route to a teammate.

Source under designs is trusted executable code. Do not place untrusted uploaded components here. A remote iframe URL is not supported by the same-origin preview integration.

## Select elements for an agent

Use **Copy element context** below a board, then click the component you mean. The outline tracks the board's scale and position. **Copy selection** copies its source file, board, DOM selector, visible text, and preview URL; paste this into Cursor or ChatGPT and describe the change. Turn off the browser's own Annotate mode before using this control. Keyboard users can focus the selection area and use Up/Down to choose a target; Escape exits. Selecting elements does not follow preview links or drag the canvas.

Use the browser's native Annotate control on a board or fullscreen preview to select an element, add a comment, and send it with your message. A received annotation has verified that the correct heading, DOM selector, iframe preview URL and screenshot reach the chat even when the browser draws an offset highlight. Treat successful context delivery and visual alignment as separate checks. There is no separate annotation view. The browser owns the composer; Design Lab does not automatically send prompts.

On ChatGPT desktop versions exposing the [Browser Annotation API](https://learn.chatgpt.com/docs/annotations-extensibility), boards also register an annotation surface in the top-level page. It maps same-origin iframe elements through the current canvas scale and offset, clips highlights to the frame, and includes the board ID, version source file, DOM selector, text and preview URL. Panning yields while annotation mode is active. The API is feature-detected; browsers without it keep ordinary canvas behavior and native annotations. `data-annotation-surface` reports registration availability; absence of this optional API does not mean native annotations cannot be sent. Cursor's [Design Mode](https://cursor.com/docs/agent/design-mode) remains a separate browser feature, not an API this app can invoke.

Generated web previews expose their entry file as `data-design-source`; optionally mark a component wrapper with `data-design-component` to make it the preferred board annotation target. Source paths identify the version entry point, not an inferred line number or the implementation file of every imported component. Email export HTML remains unchanged and script-free.
