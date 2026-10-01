"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { ReviewPanel } from "./data/ReviewPanel";
import { defaultFilePath } from "./files";
import { PreviewBoard } from "./HomepageBoard";
import { CanvasStudy } from "./OnboardingCanvas";
import type { StudioFile } from "./types";

import styles from "./home.module.css";

export function StudioHome({ files }: { files: readonly StudioFile[] }) {
  return (
    <main className={styles.home}>
      <h1>Design Lab</h1>
      <div className={styles.cards}>
        {files.map((file) => (
          <Link
            key={file.id}
            href={defaultFilePath(file)}
            className={styles.card}
          >
            <div className={styles.preview}>
              <span>{file.title}</span>
            </div>
            <div className={styles.caption}>
              <h2>{file.title}</h2>
              <ArrowUpRight size={15} aria-hidden="true" />
            </div>
            <span className={styles.status}>
              {file.kind === "email" ? "Email" : "Web"} ·{" "}
              {file.pages?.reduce((sum, page) => sum + page.boards.length, 0)}{" "}
              versions
            </span>
          </Link>
        ))}
      </div>
      {files.length === 0 && (
        <p>No designs yet. Add a design folder to get started.</p>
      )}
    </main>
  );
}
export function StudioFileCanvas({
  file,
  initialPageId,
}: {
  file: StudioFile;
  initialPageId?: string;
}) {
  const pages = file.pages ?? [];
  useEffect(() => {
    const board = new URL(window.location.href).hash
      .slice(1)
      .replace(/^board-/u, "");
    if (board)
      requestAnimationFrame(() =>
        window.dispatchEvent(
          new CustomEvent("design-canvas-focus", { detail: board })
        )
      );
  }, [file.id]);
  return (
    <CanvasStudy
      key={file.id}
      title={file.title}
      review={<ReviewPanel file={file} />}
      pages={pages}
      initialPageId={initialPageId}
      onPageChange={(id) =>
        window.history.replaceState(
          null,
          "",
          `${file.href}/exploration?page=${id}`
        )
      }
      renderBoard={(board) => (
        <PreviewBoard board={board} src={board.preview ?? ""} />
      )}
    />
  );
}
export function StudioResult({ file }: { file: StudioFile }) {
  const board = file.pages
    ?.flatMap((page) => page.boards)
    .find((item) => item.id === `${file.id}-${file.result}`);
  if (!board) return null;
  return (
    <CanvasStudy
      key={file.id}
      title={file.title}
      review={<ReviewPanel file={file} />}
      pages={[{ id: "result", title: "Result", boards: [board] }]}
      renderBoard={(item) => (
        <PreviewBoard board={item} src={item.preview ?? ""} />
      )}
    />
  );
}
