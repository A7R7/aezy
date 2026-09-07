// Adapted for Aezy; OpenCodex MIT attribution in LICENSE.opencodex.
/* Inline SVG icons (Lucide-style, stroke=currentColor). No icon-library dependency. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const S = (props: P) => ({
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props,
});

export const IconGrid = (p: P) => (<svg {...S(p)}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
export const IconCheck = (p: P) => (<svg {...S(p)}><path d="m20 6-11 11-5-5"/></svg>);
export const IconX = (p: P) => (<svg {...S(p)}><path d="M18 6 6 18M6 6l12 12"/></svg>);
export const IconRefresh = (p: P) => (<svg {...S(p)}><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16M3 21v-5h5M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8M21 3v5h-5"/></svg>);
export const IconAlert = (p: P) => (<svg {...S(p)}><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>);
