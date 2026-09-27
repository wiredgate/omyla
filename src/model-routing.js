import { rates } from './pricing.js';

const agentIds = new Set(['kai', 'mia', 'emma']);

export function resolveAgentModels(env, assignments) {
  let overrides;
  try { overrides = JSON.parse(env.AGENT_MODELS || '{}'); }
  catch { throw new Error('invalid_agent_models'); }
  if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object' || Object.keys(overrides).some(key => !agentIds.has(key))) throw new Error('invalid_agent_models');
  const selected = {};
  for (const { agentId } of assignments) {
    const model = overrides[agentId] ?? env.TEXT_MODEL;
    if (typeof model !== 'string' || !Object.hasOwn(rates, model)) throw new Error('unsupported_model');
    if (rates[model].provider === 'openai' && (env.PAID_MODELS_ENABLED !== 'true' || !env.OPENAI_API_KEY)) throw new Error('paid_model_disabled');
    selected[agentId] = model;
  }
  return selected;
}
