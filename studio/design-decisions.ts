export type FavoriteInput = {
  fileId: string;
  pageId: string;
  boardId: string;
  title: string;
  source: string;
  favorite: boolean;
};

export type DesignDecision = FavoriteInput & {
  revision?: number;
  updatedAt: string;
  reason: string;
  useFor: string;
  assembledIn: string | null;
};

export function isFavoriteInput(value: unknown): value is FavoriteInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "fileId" in value &&
    isId(value.fileId) &&
    "pageId" in value &&
    isId(value.pageId) &&
    "boardId" in value &&
    isId(value.boardId) &&
    "title" in value &&
    typeof value.title === "string" &&
    value.title.length <= 500 &&
    "source" in value &&
    typeof value.source === "string" &&
    value.source.startsWith(`/files/${value.fileId}/`) &&
    value.source.length <= 1000 &&
    "favorite" in value &&
    typeof value.favorite === "boolean"
  );
}

export function isDesignDecisions(value: unknown): value is DesignDecision[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        isFavoriteInput(item) &&
        "updatedAt" in item &&
        typeof item.updatedAt === "string" &&
        "reason" in item &&
        typeof item.reason === "string" &&
        "useFor" in item &&
        typeof item.useFor === "string" &&
        "assembledIn" in item &&
        (item.assembledIn === null || typeof item.assembledIn === "string")
    )
  );
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/u.test(value);
}
