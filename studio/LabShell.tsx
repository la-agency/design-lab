"use client";

import { Button } from "./ui/button";

import { Grid2X2, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { CanvasHistoryRelay } from "./CanvasHistory";
import { parseTabs, fileForPath } from "./files";
import type { StudioFileTab } from "./files";
import type { StudioFile, StudioConfig } from "./types";

import styles from "./lab-shell.module.css";

type Theme = "light" | "dark";
const ThemeContext = createContext<Theme>("dark");
const WorkspaceContext = createContext<{
  files: readonly StudioFile[];
  config: StudioConfig;
}>({ files: [], config: { id: "design-lab", title: "Design Lab" } });
export function useStudioWorkspace() {
  return useContext(WorkspaceContext);
}

export function useLabTheme() {
  return useContext(ThemeContext);
}

export function LabShell({
  children,
  files,
  config,
}: {
  children: ReactNode;
  files: readonly StudioFile[];
  config: StudioConfig;
}) {
  return (
    <WorkspaceContext value={{ files, config }}>
      <StudioShell>{children}</StudioShell>
    </WorkspaceContext>
  );
}
function StudioShell({ children }: { children: ReactNode }) {
  const { files, config } = useStudioWorkspace();
  const tabsKey = `${config.id}-tabs`;
  const themeKey = `${config.id}-theme`;
  const pathname = usePathname();
  const router = useRouter();
  const activeFile = fileForPath(pathname, files);
  const preview = pathname.startsWith("/previews/");
  const [tabs, setTabs] = useState<StudioFileTab[]>([]);
  const tabMemory = useRef<StudioFileTab[]>([]);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      if (localStorage.getItem(themeKey) === "light") {
        setTheme("light");
      }
    } catch {
      /* Browser storage is optional. */
    }
  }, [themeKey]);

  useEffect(() => {
    if (preview) {
      return;
    }
    let next = tabMemory.current;
    try {
      next = parseTabs(localStorage.getItem(tabsKey), files);
    } catch {
      /* Keep in-memory tabs. */
    }
    const file = fileForPath(pathname, files);
    if (file) {
      const entry = { id: file.id, href: pathname };
      next = next.some((tab) => tab.id === file.id)
        ? next.map((tab) => (tab.id === file.id ? entry : tab))
        : [...next, entry];
    }
    tabMemory.current = next;
    setTabs(next);
    try {
      localStorage.setItem(tabsKey, JSON.stringify(next));
    } catch {
      /* Keep in-memory tabs. */
    }
  }, [pathname, preview, files, tabsKey]);

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (
        event.key === themeKey &&
        (event.newValue === "light" || event.newValue === "dark")
      ) {
        setTheme(event.newValue);
      }
    }
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  function closeTab(id: StudioFileTab["id"]) {
    const index = tabs.findIndex((tab) => tab.id === id);
    const next = tabs.filter((tab) => tab.id !== id);
    tabMemory.current = next;
    setTabs(next);
    try {
      localStorage.setItem(tabsKey, JSON.stringify(next));
    } catch {
      /* Keep in-memory tabs. */
    }
    if (activeFile?.id === id) {
      router.push(next[Math.max(0, index - 1)]?.href ?? "/");
    }
  }

  function changeTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      /* Keep the current theme in memory. */
    }
  }

  if (preview) {
    return (
      <ThemeContext value={theme}>
        <div className={styles.shell} data-theme={theme} data-design-preview>
          <CanvasHistoryRelay>{children}</CanvasHistoryRelay>
        </div>
      </ThemeContext>
    );
  }

  return (
    <ThemeContext value={theme}>
      <div className={styles.shell} data-theme={theme} data-studio-shell>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand} aria-label="Design Lab home">
            {config.logo ? (
              <Image
                src={config.logo[theme]}
                alt={config.logo.alt}
                width={config.logo.width}
                height={config.logo.height}
              />
            ) : (
              <span>{config.title}</span>
            )}
          </Link>
          <nav className={styles.tabs} aria-label="Open files">
            <Link
              href="/"
              className={styles.homeTab}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <Grid2X2 size={14} />
              <span>Home</span>
            </Link>
            {tabs.map((tab) => (
              <div
                className={styles.tab}
                data-active={activeFile?.id === tab.id}
                key={tab.id}
              >
                <Link
                  href={tab.href}
                  aria-current={activeFile?.id === tab.id ? "page" : undefined}
                >
                  {files.find((file) => file.id === tab.id)?.title}
                </Link>
                <Button variant="ghost" size="sm"
                  type="button"
                  onClick={() => closeTab(tab.id)}
                  aria-label={`Close ${files.find((file) => file.id === tab.id)?.title}`}
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
          </nav>
          <fieldset className={styles.theme} aria-label="Appearance">
            <Button variant="ghost" size="sm"
              type="button"
              aria-label="Light mode"
              aria-pressed={theme === "light"}
              onClick={() => changeTheme("light")}
            >
              <Sun size={15} />
            </Button>
            <Button variant="ghost" size="sm"
              type="button"
              aria-label="Dark mode"
              aria-pressed={theme === "dark"}
              onClick={() => changeTheme("dark")}
            >
              <Moon size={15} />
            </Button>
          </fieldset>
        </header>
        {activeFile && (
          <div className={styles.filebar}>
            <nav aria-label="Design stages">
              {activeFile.final ? (
                <Link
                  href={`${activeFile.href}/final`}
                  aria-current={
                    pathname.endsWith("/final") ? "page" : undefined
                  }
                >
                  Result
                  {activeFile.final.status === "wip" && (
                    <span className={styles.stageStatus}>WIP</span>
                  )}
                </Link>
              ) : (
                <span
                  className={styles.pendingStage}
                  aria-disabled="true"
                  title="Available when a decision is locked in"
                >
                  Result
                </span>
              )}
              <Link
                href={`${activeFile.href}/exploration`}
                aria-current={
                  pathname.endsWith("/exploration") ? "page" : undefined
                }
              >
                Explore
              </Link>
            </nav>
          </div>
        )}
        {children}
      </div>
    </ThemeContext>
  );
}
