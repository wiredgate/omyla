import { randomUUID } from 'node:crypto';

export const agents = Object.freeze([
  { id: 'manager', name: 'Manager', role: 'orchestration' },
  { id: 'kai', name: 'Kai', role: 'engineering' },
  { id: 'mia', name: 'Mia', role: 'design' },
  { id: 'emma', name: 'Emma', role: 'operations' }
]);

export class MemoryStore {
  constructor() { this.goals = new Map(); this.events = []; this.approvals = new Map(); }
  emit(type, data) { const event = { id: randomUUID(), type, at: new Date().toISOString(), ...data }; this.events.push(event); return event; }
}

export class PermissionEngine {
  evaluate({ capability, resource, amount = 0 }) {
    if (resource?.kind === 'physical') return 'block';
    if (['publish', 'send_external', 'delete', 'purchase'].includes(capability)) return 'ask';
    if (amount > 0) return 'ask';
    if (['read', 'draft', 'annotate', 'edit_local'].includes(capability)) return 'allow';
    return 'block';
  }
}

export class DemoModelAdapter {
  async execute({ agent, instruction, context }) {
    await new Promise(resolve => setTimeout(resolve, agent.id === 'kai' ? 350 : 200));
    const detail = {
      kai: '画面のエラーを調査する作業案を作成。実際のコード変更にはリポジトリ接続が必要。',
      mia: '画面の視線誘導、文字の読みやすさ、主要操作の配置について改善案を作成。',
      emma: '重要メールの確認と返信案の作成にはメール接続が必要。送信は承認対象。'
    }[agent.id];
    return { text: `${agent.name}: ${detail ?? instruction}`, contextReceived: Boolean(context), model: 'demo-adapter' };
  }
}

export class Orchestrator {
  constructor({ store = new MemoryStore(), policy = new PermissionEngine(), model = new DemoModelAdapter() } = {}) {
    Object.assign(this, { store, policy, model });
  }
  snapshot() { return { agents, goals: [...this.store.goals.values()], approvals: [...this.store.approvals.values()], events: this.store.events }; }
  createGoal({ text, context = null }) {
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('依頼は1〜4000文字で入力してね');
    const id = randomUUID();
    const steps = ['kai', 'mia', 'emma'].map(agentId => ({ id: randomUUID(), agentId, state: 'queued', result: null }));
    const goal = { id, text: text.trim(), context, state: 'working', createdAt: new Date().toISOString(), steps };
    this.store.goals.set(id, goal);
    this.store.emit('goal_created', { goalId: id });
    queueMicrotask(() => this.run(goal));
    return goal;
  }
  async run(goal) {
    await Promise.all(goal.steps.map(async step => {
      const agent = agents.find(item => item.id === step.agentId);
      step.state = 'working'; this.store.emit('step_started', { goalId: goal.id, stepId: step.id, agentId: step.agentId });
      try {
        step.result = await this.model.execute({ agent, instruction: goal.text, context: goal.context });
        if (step.agentId === 'kai') {
          const action = { capability: 'publish', resource: { kind: 'digital', id: 'demo-site' }, summary: 'デモサイトを公開する', amount: 0 };
          if (this.policy.evaluate(action) === 'ask') {
            const approval = { id: randomUUID(), goalId: goal.id, stepId: step.id, action, state: 'pending', createdAt: new Date().toISOString() };
            this.store.approvals.set(approval.id, approval); step.state = 'needs_you';
            this.store.emit('approval_requested', { goalId: goal.id, stepId: step.id, approvalId: approval.id }); return;
          }
        }
        step.state = 'done'; this.store.emit('step_done', { goalId: goal.id, stepId: step.id });
      } catch (error) { step.state = 'failed'; step.error = String(error); this.store.emit('step_failed', { goalId: goal.id, stepId: step.id }); }
    }));
    this.reconcile(goal);
  }
  decide(approvalId, decision) {
    const approval = this.store.approvals.get(approvalId);
    if (!approval || approval.state !== 'pending') throw new Error('有効な承認依頼が見つからない');
    if (!['approve', 'deny'].includes(decision)) throw new Error('承認か却下を選んでね');
    const goal = this.store.goals.get(approval.goalId);
    const step = goal.steps.find(item => item.id === approval.stepId);
    approval.state = decision === 'approve' ? 'approved' : 'denied';
    approval.decidedAt = new Date().toISOString();
    // This foundation never performs a real publish, even when approved.
    step.state = decision === 'approve' ? 'done' : 'cancelled';
    step.result = { ...step.result, approvalOutcome: decision, simulated: true };
    this.store.emit('approval_decided', { goalId: goal.id, approvalId, decision });
    this.reconcile(goal);
    return approval;
  }
  reconcile(goal) {
    goal.state = goal.steps.some(step => step.state === 'needs_you') ? 'needs_you'
      : goal.steps.every(step => ['done', 'cancelled', 'failed'].includes(step.state)) ? 'done' : 'working';
    if (goal.state === 'done') this.store.emit('goal_done', { goalId: goal.id });
  }
}
