// Adapted from OpenCodex v2.33.0 (MIT); see LICENSE.opencodex and NOTICE.
export type LogSurface = string;
export type LogSurfaceFilter = string;
export function logMatchesSurface(log: { surface?: string }, filter: string): boolean { return filter === "all" || log.surface === filter; }
