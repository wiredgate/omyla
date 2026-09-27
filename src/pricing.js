// USD prices per 1,000,000 tokens. Review against provider pricing before billing.
export const RATE_VERSION = '2026-09-27';
export const DEFAULT_MARGIN_BPS = 3500;
export const rates = Object.freeze({
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { provider: 'cloudflare', input: 0.045, output: 0.384 },
  'gpt-6-astra': { provider: 'openai', input: 10, output: 50 },
  'gpt-6-sol': { provider: 'openai', input: 2, output: 10 },
  'gpt-6-luna': { provider: 'openai', input: 0.1, output: 0.5 }
});

export function providerCostMicros(model, inputTokens, outputTokens) {
  const rate = rates[model];
  if (!rate || !Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) || outputTokens < 0) return null;
  // 1 USD = 1M micro USD, so tokens * USD-per-M-token yields micro USD.
  return Math.ceil(inputTokens * rate.input + outputTokens * rate.output);
}

export function customerPriceMicros(providerCost, marginBps = DEFAULT_MARGIN_BPS) {
  if (!Number.isSafeInteger(providerCost) || providerCost < 0 || !Number.isInteger(marginBps) || marginBps < 0 || marginBps >= 10000) return null;
  return Math.ceil(providerCost * 10000 / (10000 - marginBps));
}

export function modelUsage(response) {
  const usage = response?.usage;
  const input = usage?.prompt_tokens;
  const output = usage?.completion_tokens;
  if (!Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0) return null;
  return { inputTokens: input, outputTokens: output };
}

export function previewPricing(assignments, model, requestedMarginBps = DEFAULT_MARGIN_BPS) {
  const marginBps = Number.isInteger(requestedMarginBps) && requestedMarginBps >= 0 && requestedMarginBps <= 9000 ? requestedMarginBps : DEFAULT_MARGIN_BPS;
  const perCallCap = providerCostMicros(model, 16000, 180);
  return {
    currency: 'USD', rateVersion: RATE_VERSION, marginBps,
    status: 'preview_unbilled',
    // An engineering estimate for the current short preview call; not a paid authorization.
    estimatedProviderCapMicros: perCallCap === null ? null : perCallCap * assignments.length,
    estimatedCustomerCapMicros: perCallCap === null ? null : customerPriceMicros(perCallCap * assignments.length, marginBps),
    actualProviderCostMicros: null, suggestedCustomerPriceMicros: null,
    meteringComplete: false
  };
}

export function finalizePreviewPricing(steps, pricing) {
  const costs = steps.map(step => step.usage && step.state === 'done' ? providerCostMicros(step.model, step.usage.inputTokens, step.usage.outputTokens) : null);
  const complete = costs.every(cost => cost !== null);
  const actual = complete ? costs.reduce((sum, cost) => sum + cost, 0) : null;
  return { ...pricing, meteringComplete: complete, actualProviderCostMicros: actual, suggestedCustomerPriceMicros: actual === null ? null : customerPriceMicros(actual, pricing.marginBps) };
}
