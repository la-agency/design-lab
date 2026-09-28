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

Author definitions in `designs/`. Browser layout choices live in `.studio/layouts.json`, selections in `.studio/decisions.json`. Commit all three. New boards are appended when restoring a saved layout, removed boards are ignored, existing choices are retained. To intentionally reset saved dimensions, close the dev server, edit only the relevant layout record, and restart. Keep backups via Git.

To share a specific candidate, copy its `/files/<id>/exploration?page=<page>#board-<id>-<version>` URL. A loopback URL works only on a machine running that workspace; send repository access and the relative route to a teammate.

Source under designs is trusted executable code. Do not place untrusted uploaded components here. A remote iframe URL is not supported by the same-origin preview integration.
