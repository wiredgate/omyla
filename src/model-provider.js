export async function runModel(env, model, instructions, input) {
  if (model.startsWith('@cf/')) {
    const result = await env.AI.run(model, { messages: [{ role: 'system', content: instructions }, { role: 'user', content: input }], max_tokens: 180, temperature: 0.3 });
    return { text: result.response, usage: result.usage };
  }
  if (!['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'].includes(model)) throw new Error('unsupported_model');
  if (!env.OPENAI_API_KEY) throw new Error('provider_unconfigured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, instructions, input, reasoning: { effort: 'low' }, max_output_tokens: 1200, store: false }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const result = await response.json();
  if (result.status !== 'completed') throw new Error('provider_incomplete');
  const text = (result.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  return { text, usage: result.usage };
}
