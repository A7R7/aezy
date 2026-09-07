// Product retirement identities, not a replacement preset registry.
export const isRetiredPreset = id => id === 'aezy' || id === 'codex-inspired'
  || /^codex-inspired-r\d+-[a-f0-9]{64}$/.test(id ?? '')
export const retiredPresetMessage = '此运行方式已封存，请新建会话并选择标准模式或 Codex App Server。'
