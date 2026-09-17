import "server-only";

const API_URL = "https://api.vercel.com/v1/query/web-analytics/visits";
const DEFAULT_PROJECT_ID = "prj_BaSrO9b3ZYCYprdDdvxSsva1id0S";
const DEFAULT_TEAM_ID = "team_R7Xx9hVoI69YAT6evmIxbZIn";

type CountResponse = {
  data: { pageviews: number; visitors: number };
};

type AggregateRow = {
  timestamp?: string;
  requestPath?: string;
  referrerHostname?: string;
  deviceType?: string;
  pageviews: number;
  visitors: number;
};

type AggregateResponse = {
  data: AggregateRow[];
};

export type WebAnalytics = {
  pageviews: number;
  visitors: number;
  daily: AggregateRow[];
  pages: AggregateRow[];
  referrers: AggregateRow[];
  devices: AggregateRow[];
};

export function isVercelAnalyticsConfigured() {
  return Boolean(process.env.VERCEL_ANALYTICS_TOKEN);
}

async function queryVercel<T>(endpoint: "count" | "aggregate", params: Record<string, string>) {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  if (!token) throw new Error("Vercel Analytics is not configured.");

  const query = new URLSearchParams({
    projectId: process.env.VERCEL_PROJECT_ID ?? DEFAULT_PROJECT_ID,
    teamId: process.env.VERCEL_TEAM_ID ?? DEFAULT_TEAM_ID,
    ...params,
  });
  const response = await fetch(`${API_URL}/${endpoint}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`Vercel Analytics returned ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function loadVercelAnalytics(since: string, until: string): Promise<WebAnalytics> {
  const shared = { since, until };
  const [totals, daily, pages, referrers, devices] = await Promise.all([
    queryVercel<CountResponse>("count", shared),
    queryVercel<AggregateResponse>("aggregate", { ...shared, by: "day" }),
    queryVercel<AggregateResponse>("aggregate", { ...shared, by: "requestPath", limit: "8" }),
    queryVercel<AggregateResponse>("aggregate", { ...shared, by: "referrerHostname", limit: "8" }),
    queryVercel<AggregateResponse>("aggregate", { ...shared, by: "deviceType", limit: "8" }),
  ]);

  return {
    pageviews: totals.data.pageviews,
    visitors: totals.data.visitors,
    daily: daily.data,
    pages: pages.data,
    referrers: referrers.data,
    devices: devices.data,
  };
}
