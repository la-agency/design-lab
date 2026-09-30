export type BoardDefinition = {
  id: string;
  title: string;
  description: string;
  width: number;
  height: number;
  ideaId?: string;
  groupName?: string;
  newRow?: boolean;
  preview?: string;
  sourcePath?: string;
  exportUrl?: string;
};
export type CanvasPage = {
  id: string;
  title: string;
  boards: BoardDefinition[];
};

export type StudioFile = {
  id: string;
  title: string;
  href: string;
  final?: { label: string; status?: "wip" };
  versions?: string[];
  pages?: CanvasPage[];
  kind?: "web" | "email";
  result?: string;
};
export type StudioConfig = {
  id: string;
  title: string;
  logo?: {
    light: string;
    dark: string;
    alt: string;
    width: number;
    height: number;
  };
};
