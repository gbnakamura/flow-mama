"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const privatePaths = ["/admin", "/auth", "/book/success", "/personal-training/success"];

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const pathname = new URL(event.url).pathname;
        return privatePaths.some((path) => pathname.startsWith(path)) ? null : event;
      }}
    />
  );
}
