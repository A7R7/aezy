// Adapted from OpenCodex v2.33.0 (MIT); see LICENSE.opencodex and NOTICE.
import type { KeyboardEvent } from "react";

export type LogsTab = "logs" | "debug";

export function readTabFromHash(): LogsTab {
  return new URL(window.location.href).searchParams.get('aezyTab') === 'debug' ? 'debug' : 'logs';
}

export function selectLogsTab(next: LogsTab) {
  const url = new URL(window.location.href);
  url.searchParams.set('aezyView', 'logs');
  url.searchParams.set('aezyTab', next);
  window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function logsTabKeyDown(e: KeyboardEvent) {
  if (e.key === "ArrowLeft" || e.key === "Home") {
    e.preventDefault();
    selectLogsTab("logs");
    document.getElementById("logs-tab-logs")?.focus();
  } else if (e.key === "ArrowRight" || e.key === "End") {
    e.preventDefault();
    selectLogsTab("debug");
    document.getElementById("logs-tab-debug")?.focus();
  }
}
