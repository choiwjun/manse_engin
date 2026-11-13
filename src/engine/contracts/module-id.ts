export const ENGINE_MODULE_IDS = [
  'saju',
  'calendar',
] as const;

export type EngineModuleId = (typeof ENGINE_MODULE_IDS)[number];

const ENGINE_MODULE_ID_SET = new Set<string>(ENGINE_MODULE_IDS);

export function isEngineModuleId(value: unknown): value is EngineModuleId {
  return typeof value === 'string' && ENGINE_MODULE_ID_SET.has(value);
}
