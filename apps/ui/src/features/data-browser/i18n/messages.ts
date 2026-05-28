export const dataBrowserMessages = {
  "browser.placeholder.body":
    "Read-only object browsing will be migrated into this pane in the next task.",
  "browser.placeholder.title": "Database browser shell is ready",
  "browser.unsupported.body":
    "This database engine is not available in the first browser version.",
  "browser.unsupported.title": "Unsupported database engine",
} as const;

export type DataBrowserMessageKey = keyof typeof dataBrowserMessages;
