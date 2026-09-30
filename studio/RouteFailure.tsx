"use client";

import { Button } from "./ui/button";

/* oxlint-disable next/no-html-link-for-pages -- Full document navigation also recovers from a broken root layout/router. */

import s from "./route-failure.module.css";

export function RouteFailure({
  preview = false,
  retry,
}: {
  preview?: boolean;
  retry: () => void;
}) {
  return (
    <section className={s.failure} role="alert">
      <h1>
        {preview
          ? "This preview couldn’t render."
          : "This page couldn’t render."}
      </h1>
      <p>Fix the error, then try again. You can still open another design.</p>
      <div>
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="ghost">
          <a href="/" target={preview ? "_top" : undefined}>Design Lab home</a>
        </Button>
      </div>
    </section>
  );
}
