// Adapted from OpenCodex v2.33.0 (MIT); see LICENSE.opencodex and NOTICE.
import { useI18n } from "../i18n/shared";
import type { InboundEntry } from "./debug-shared";
import { formatInboundTime } from "./debug-shared";

export function DebugInboundPanel({ entries }: { entries: InboundEntry[] }) {
  const { t } = useI18n();

  return (
    <div className="card" style={{ marginBottom: 16, padding: "12px 14px" }}>
      <div className="font-semibold" style={{ marginBottom: 4 }}>{t("debug.inbound.title")}</div>
      <div className="muted text-control" style={{ marginBottom: 10 }}>{t("debug.inbound.sub")}</div>
      {entries.length === 0 ? (
        <div className="muted text-control">{t("debug.inbound.empty")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table text-label">
            <thead>
              <tr>
                <th>{t("debug.inbound.time")}</th>
                <th>{t("debug.inbound.endpoint")}</th>
                <th>{t("debug.inbound.model")}</th>
                <th>thinking</th>
                <th>effort</th>
                <th>beta</th>
                <th>metadata</th>
                <th>system</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td className="muted mono">{formatInboundTime(entry.at)}</td>
                  <td className="mono">{entry.endpoint}</td>
                  <td className="mono" title={entry.resolvedModel}>
                    {entry.model}
                    {entry.resolvedModel && entry.resolvedModel !== entry.model && (
                      <span className="muted"> → {entry.resolvedModel}</span>
                    )}
                  </td>
                  <td className="mono">
                    {entry.thinkingType ?? "-"}
                    {entry.thinkingBudgetTokens !== undefined && <span className="muted"> ({entry.thinkingBudgetTokens})</span>}
                  </td>
                  <td className="mono">{entry.outputConfigEffort ?? "-"}</td>
                  <td className="mono" title={entry.anthropicBeta} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.anthropicBeta ?? "-"}</td>
                  <td className="mono" title={entry.metadataKeys?.join(", ")}>
                    {entry.hasMetadataUserId ? `user_id ${entry.userIdTag ?? ""}` : t("debug.inbound.none")}
                  </td>
                  <td className="mono">{entry.hasSystem ? entry.systemTag ?? "yes" : t("debug.inbound.none")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
