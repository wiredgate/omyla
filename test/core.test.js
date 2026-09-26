import test from 'node:test';
import assert from 'node:assert/strict';
import { Orchestrator, PermissionEngine } from '../src/core.js';

test('three agents execute concurrently and an approval blocks only its step', async () => {
  let active = 0, peak = 0;
  const model = { async execute({ agent }) { peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 15)); active--; return { text: agent.name }; } };
  const app = new Orchestrator({ model });
  const goal = app.createGoal({ text: '3人に仕事を頼む' });
  await new Promise(resolve => setTimeout(resolve, 90));
  assert.equal(peak, 3);
  assert.equal(goal.state, 'needs_you');
  assert.deepEqual(goal.steps.map(step => step.state), ['needs_you', 'done', 'done']);
  const approval = app.snapshot().approvals[0];
  app.decide(approval.id, 'approve');
  assert.equal(goal.state, 'done');
  assert.equal(goal.steps[0].result.simulated, true);
  assert.throws(() => app.decide(approval.id, 'approve'));
});

test('physical operations are blocked and external actions require approval', () => {
  const policy = new PermissionEngine();
  assert.equal(policy.evaluate({ capability: 'read', resource: { kind: 'digital' } }), 'allow');
  assert.equal(policy.evaluate({ capability: 'send_external', resource: { kind: 'digital' } }), 'ask');
  assert.equal(policy.evaluate({ capability: 'unlock', resource: { kind: 'physical' } }), 'block');
});
