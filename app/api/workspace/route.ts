import { createWorkspaceHandlers } from "@la-agent/design-lab/data";
import { files } from "../../../.studio/catalog";
export const runtime = "nodejs";
export const { GET, POST } = createWorkspaceHandlers({ files });
