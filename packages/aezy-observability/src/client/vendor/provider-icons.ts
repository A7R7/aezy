// Adapted for Aezy; OpenCodex MIT attribution in LICENSE.opencodex.
export function formatProviderDisplayName(provider: string) { return provider === "openai" ? "OpenAI (Codex login)" : provider === "deepseek" ? "DeepSeek" : provider; }
