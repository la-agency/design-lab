export type Feedback = {
  fileId: string; boardId: string; body: string; resolved: boolean;
  author: string; createdAt: string;
  sourcePath: string; sourceRevision: string; selector: string; selectedText: string;
};
export type Comment = { threadId: string; body: string };
export type Collection = { fileId: string; name: string; boardIds: string[]; archived: boolean };
