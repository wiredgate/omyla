// USD prices per 1,000,000 tokens. Review against provider pricing before billing.
export const RATE_VERSION = '2026-09-27';
export const DEFAULT_MARGIN_BPS = 3500;
export const rates = Object.freeze({
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { provider: 'cloudflare', input: 0.045, output: 0.384 },
  '@cf/google/gemma-4-26b-a4b-it': { provider: 'cloudflare', input: 0.1, output: 0.3 },
  '@cf/meta/llama-3.2-11b-vision-instruct': { provider: 'cloudflare', input: 0.049, output: 0.676 },
  'gpt-6-astra': { provider: 'openai', input: 10, cachedInput: 1, output: 50 },
  'gpt-6-sol': { provider: 'openai', input: 2, cachedInput: 0.2, output: 10 },
  'gpt-6-luna': { provider: 'openai', input: 0.1, cachedInput: 0.01, output: 0.5 }
});

export function providerCostMicros(model, inputTokens, outputTokens, cachedInputTokens = 0) {
  const rate = rates[model];
  if (!rate || !Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0) return null;
  // 1 USD = 1M micro USD, so tokens * USD-per-M-token yields micro USD.
  if (!Number.isSafeInteger(cachedInputTokens) || cachedInputTokens < 0 || cachedInputTokens > inputTokens) return null;
  return Math.ceil((inputTokens - cachedInputTokens) * rate.input + cachedInputTokens * (rate.cachedInput ?? rate.input) + outputTokens * rate.output);
}

export function customerPriceMicros(providerCost, marginBps = DEFAULT_MARGIN_BPS) {
  if (!Number.isSafeInteger(providerCost) || providerCost < 0 || !Number.isInteger(marginBps) || marginBps < 0 || marginBps >= 10000) return null;
  return Math.ceil(providerCost * 10000 / (10000 - marginBps));
}

export function modelUsage(response) {
  const usage = response?.usage;
  const input = usage?.prompt_tokens ?? usage?.input_tokens;
  const output = usage?.completion_tokens ?? usage?.output_tokens;
  if (!Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0) return null;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  return { inputTokens: input, outputTokens: output, cachedInputTokens: Number.isSafeInteger(cached) && cached >= 0 && cached <= input ? cached : 0 };
}

export function previewPricing(assignments, requestedMarginBps = DEFAULT_MARGIN_BPS) {
  const marginBps = Number.isInteger(requestedMarginBps) && requestedMarginBps >= 0 && requestedMarginBps <= 9000 ? requestedMarginBps : DEFAULT_MARGIN_BPS;
  const estimatedProviderCapMicros = assignments.reduce((total, assignment) => {
    const model = assignment.model;
    const cap = providerCostMicros(model, 16000, model.startsWith('gpt-6-') ? 1200 : 180);
    return total === null || cap === null ? null : total + cap;
  }, 0);
  return {
    currency: 'USD', rateVersion: RATE_VERSION, marginBps,
    status: 'preview_unbilled',
    // An engineering estimate for the current short preview call; not a paid authorization.
    estimatedProviderCapMicros,
    estimatedCustomerCapMicros: estimatedProviderCapMicros === null ? null : customerPriceMicros(estimatedProviderCapMicros, marginBps),
    actualProviderCostMicros: null, suggestedCustomerPriceMicros: null,
    meteringComplete: false
  };
}

export function finalizePreviewPricing(steps, pricing) {
  const costs = steps.map(step => step.usage && step.state === 'done' ? providerCostMicros(step.model, step.usage.inputTokens, step.usage.outputTokens, step.usage.cachedInputTokens) : null);
  const complete = costs.every(cost => cost !== null);
  const actual = complete ? costs.reduce((sum, cost) => sum + cost, 0) : null;
  return { ...pricing, meteringComplete: complete, actualProviderCostMicros: actual, suggestedCustomerPriceMicros: actual === null ? null : customerPriceMicros(actual, pricing.marginBps) };
}

// Approximate Workers AI audio rate from 2026-09-27 public pricing; not a provider invoice.
export function audioCostMicros(model, durationMs) {
  if (model !== '@cf/openai/whisper-large-v3-turbo' || !Number.isSafeInteger(durationMs) || durationMs <= 0 || durationMs > 15000) return null;
  return Math.ceil(durationMs * 500 / 60000);
}
