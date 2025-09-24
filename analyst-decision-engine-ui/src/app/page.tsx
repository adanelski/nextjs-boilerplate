"use client"
import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { evaluateCondition, nlForCondition, type ConditionNode } from '@/lib/evaluator'

type Channel = 'SMS' | 'EMAIL' | 'MAIL' | 'PORTAL'
type MlCommType = 'nurture' | 'proactive' | 'reactive'

type SpecificAction = {
  mode: 'SPECIFIC'
  channel: Channel
  contentId: string
}

type MlAction = {
  mode: 'ML'
  communicationType: MlCommType
  allowedChannels: Channel[]
}

type Action = SpecificAction | MlAction

type Condition = { type: 'CONDITION'; field: string; operator: string; value?: any; value2?: any }
type ConditionGroup = { type: 'GROUP'; op: 'AND' | 'OR'; children: ConditionNode[] }

type Rule = {
  id: string
  name: string
  priority: number
  conditions: ConditionGroup
  action: Action
}

function genId(prefix: string = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

const FIELD_OPTIONS = [
  { key: 'scores.refiPropensity', label: 'Refi Propensity (0-1)', type: 'number' },
  { key: 'loan.currentUpb', label: 'Current UPB', type: 'number' },
  { key: 'loan.ficoAtOrigination', label: 'FICO at Origination', type: 'number' },
  { key: 'contact.emailConsent', label: 'Email Consent', type: 'boolean' },
  { key: 'marketSegment', label: 'Market Segment', type: 'enum' },
]

const OPERATORS = ['>', '<', '=', '≠', 'BETWEEN', 'CONTAINS', 'STARTS WITH', 'EXISTS', 'NOT EXISTS', 'TRUE', 'FALSE', 'IN', 'OUT']

type Customer = any

function generateCustomers(n: number): Customer[] {
  const segs = ['Actively Shopping', 'Entering Market', 'Not in Market']
  const states = ['CA', 'TX', 'FL', 'NY', 'WA']
  const out: Customer[] = []
  for (let i = 0; i < n; i++) {
    const currentUpb = Math.floor(50000 + Math.random() * 900000)
    out.push({
      id: `CUST-${i + 1}`,
      marketSegment: segs[i % segs.length],
      contact: {
        emailConsent: Math.random() > 0.25,
      },
      property: { state: states[i % states.length] },
      loan: {
        currentUpb,
        ficoAtOrigination: 600 + Math.floor(Math.random() * 200),
      },
      scores: {
        refiPropensity: Number(Math.random().toFixed(2)),
      },
    })
  }
  return out
}

type DragProps = { attributes: any; listeners: any }

function SortableItem({ id, children }: { id: string; children: (drag: DragProps) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  )
}

function actionSummary(action: Action): string {
  if (action.mode === 'SPECIFIC') {
    return `${action.channel}: ${action.contentId}`
  }
  return `ML (${action.communicationType}) via [${action.allowedChannels.join(', ')}]`
}

export default function Home() {
  const [rules, setRules] = useState<Rule[]>([{
    id: genId('rule'),
    name: 'High Value Refinance Opportunities',
    priority: 1,
    conditions: { type: 'GROUP', op: 'AND', children: [
      { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.6 },
      { type: 'CONDITION', field: 'loan.currentUpb', operator: '>', value: 300000 },
      { type: 'CONDITION', field: 'loan.ficoAtOrigination', operator: '>', value: 720 },
    ] },
    action: { mode: 'SPECIFIC', channel: 'EMAIL', contentId: 'emails_5678' },
  }])
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(rules[0]?.id ?? null)
  const [status, setStatus] = useState<'DRAFT' | 'DEPLOYED'>('DRAFT')
  const [customers] = useState<Customer[]>(() => generateCustomers(100))
  const [outcomes, setOutcomes] = useState<null | {
    current: { customerId: string; ruleName?: string; action?: string; recapture: number }
    previous: { customerId: string; ruleName?: string; action?: string; recapture: number }
  }[]>(null)

  const selectedRule = useMemo(() => rules.find(r => r.id === selectedRuleId) ?? null, [rules, selectedRuleId])

  function addRule() {
    const newRule: Rule = {
      id: genId('rule'),
      name: 'New Rule',
      priority: rules.length + 1,
      conditions: { type: 'GROUP', op: 'AND', children: [] },
      action: { mode: 'SPECIFIC', channel: 'EMAIL', contentId: '' },
    }
    const next = [...rules, newRule]
    setRules(next)
    setSelectedRuleId(newRule.id)
  }

  function updateRule(patch: Partial<Rule>) {
    if (!selectedRule) return
    setRules(prev => prev.map(r => r.id === selectedRule.id ? { ...r, ...patch } : r))
  }

  function deleteRule(id: string) {
    const next = rules.filter(r => r.id !== id)
    next.forEach((r, idx) => r.priority = idx + 1)
    setRules(next)
    if (selectedRuleId === id) setSelectedRuleId(next[0]?.id ?? null)
  }

  function onDragEndRules(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = rules.findIndex(r => r.id === active.id)
    const newIndex = rules.findIndex(r => r.id === over.id)
    const reordered = arrayMove(rules, oldIndex, newIndex).map((r, i) => ({ ...r, priority: i + 1 }))
    setRules(reordered)
  }

  // Static previous version of rules for comparison (POC)
  const previousRules: Rule[] = [
    {
      id: 'prev-1',
      name: 'Legacy Refi Outreach',
      priority: 1,
      conditions: { type: 'GROUP', op: 'AND', children: [
        { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.5 },
        { type: 'CONDITION', field: 'loan.currentUpb', operator: '>', value: 250000 },
      ]},
      action: { mode: 'SPECIFIC', channel: 'SMS', contentId: 'sms_legacy_101' },
    },
    {
      id: 'prev-2',
      name: 'Legacy Nurture',
      priority: 2,
      conditions: { type: 'GROUP', op: 'OR', children: [
        { type: 'CONDITION', field: 'marketSegment', operator: 'IN', value: 'Not in Market' },
        { type: 'CONDITION', field: 'contact.emailConsent', operator: 'FALSE' },
      ]},
      action: { mode: 'ML', communicationType: 'nurture', allowedChannels: ['EMAIL', 'PORTAL'] },
    },
  ]

  function scoreRecapture(cust: Customer, actionStr: string): number {
    // Simple POC scoring: base on propensity + channel weight
    const base = Number(cust?.scores?.refiPropensity ?? 0)
    const channelWeights: Record<string, number> = { EMAIL: 0.05, SMS: 0.08, MAIL: 0.03, PORTAL: 0.04, 'No Communication': -0.02 }
    let weight = 0
    if (/EMAIL/.test(actionStr)) weight = channelWeights.EMAIL
    else if (/SMS/.test(actionStr)) weight = channelWeights.SMS
    else if (/MAIL/.test(actionStr)) weight = channelWeights.MAIL
    else if (/PORTAL/.test(actionStr)) weight = channelWeights.PORTAL
    else weight = channelWeights['No Communication']
    const score = Math.max(0, Math.min(1, base + weight))
    return Number(score.toFixed(2))
  }

  function evalRuleset(ruleset: Rule[], cust: Customer) {
    let matched: Rule | undefined
    for (const r of ruleset.sort((a, b) => a.priority - b.priority)) {
      if (evaluateCondition(r.conditions as any, cust)) { matched = r; break }
    }
    const action = matched ? actionSummary(matched.action) : 'No Communication'
    return { ruleName: matched?.name, action, recapture: scoreRecapture(cust, action) }
  }

  function runTest() {
    const results = customers.map(cust => {
      const current = evalRuleset([...rules], cust)
      const previous = evalRuleset([...previousRules], cust)
      return { current: { customerId: cust.id, ...current }, previous: { customerId: cust.id, ...previous } }
    })
    setOutcomes(results)
  }

  const conditionsNL = selectedRule ? nlForCondition(selectedRule.conditions as any) : ''

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Analyst Decision Engine</h1>
            <p className="text-sm text-gray-600">Configure outreach rules and validate against a sample population</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status: <span className="font-medium">{status}</span></span>
            <button onClick={() => setStatus('DRAFT')} className="btn">Save as Draft</button>
            <button onClick={() => setStatus('DEPLOYED')} className="btn">Deploy</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Rules</div>
                <button onClick={addRule} className="btn text-sm">Add Rule</button>
              </div>
              <div className="mt-3">
                <DndContext sensors={sensors} onDragEnd={onDragEndRules}>
                  <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {rules.map(r => (
                        <SortableItem key={r.id} id={r.id}>
                          {({ attributes, listeners }) => (
                            <li className={`card p-3 ${selectedRuleId === r.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedRuleId(r.id)}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <button title="Drag" className="cursor-grab px-2 py-1 select-none" onMouseDown={(e)=>e.stopPropagation()} {...attributes} {...listeners}>⠿</button>
                                  <div className="font-medium">{r.priority}. {r.name}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); deleteRule(r.id) }} className="text-red-600 text-sm">Delete</button>
                              </div>
                            </li>
                          )}
                        </SortableItem>
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedRule && (
              <div className="card p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Rule Name</label>
                    <input className="input w-full" value={selectedRule.name} onChange={e => updateRule({ name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Priority</label>
                    <input type="number" className="input w-full" value={selectedRule.priority} onChange={e => updateRule({ priority: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Conditions</div>
                  <ConditionEditor node={selectedRule.conditions} onChange={(n)=>updateRule({ conditions: n as any })} />
                  <div className="text-sm text-gray-600">NL Preview: {conditionsNL}</div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Action</div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" checked={selectedRule.action.mode === 'SPECIFIC'} onChange={() => updateRule({ action: { mode: 'SPECIFIC', channel: 'EMAIL', contentId: '' } as Action })} />
                      Specific Action
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="radio" checked={selectedRule.action.mode === 'ML'} onChange={() => updateRule({ action: { mode: 'ML', communicationType: 'nurture', allowedChannels: ['EMAIL'] } as Action })} />
                      ML Optimization
                    </label>
                  </div>

                  {selectedRule.action.mode === 'SPECIFIC' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Channel</label>
                        <select className="select w-full" value={selectedRule.action.channel}
                          onChange={e => updateRule({ action: { ...selectedRule.action, channel: e.target.value as Channel } as Action })}>
                          {(['SMS','EMAIL','MAIL','PORTAL'] as Channel[]).map(ch => <option key={ch} value={ch}>{ch}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-gray-600">Content ID</label>
                        <input className="input w-full" placeholder="e.g., emails_123" value={selectedRule.action.contentId}
                          onChange={e => updateRule({ action: { ...selectedRule.action, contentId: e.target.value } as Action })} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600">Communication Type</label>
                        <select className="select w-full" value={selectedRule.action.communicationType}
                          onChange={e => updateRule({ action: { ...selectedRule.action, communicationType: e.target.value as MlCommType } as Action })}>
                          {(['nurture','proactive','reactive'] as MlCommType[]).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm text-gray-600">Allowed Channels</label>
                        <div className="flex flex-wrap gap-2">
                          {(['SMS','EMAIL','MAIL','PORTAL'] as Channel[]).map(ch => {
                            const checked = (selectedRule.action as MlAction).allowedChannels.includes(ch)
                            return (
                              <label key={ch} className="inline-flex items-center gap-2 select-none btn text-sm">
                                <input type="checkbox" checked={checked} onChange={(e) => {
                                  const curr = new Set((selectedRule.action as MlAction).allowedChannels)
                                  if (e.target.checked) curr.add(ch); else curr.delete(ch)
                                  updateRule({ action: { ...(selectedRule.action as MlAction), allowedChannels: Array.from(curr) } as Action })
                                }} />
                                {ch}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Testing</div>
                <button onClick={runTest} className="btn">Run against 100 sample customers</button>
              </div>
              {outcomes && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(() => {
                      const currentAvg = Number((outcomes.reduce((a, r) => a + r.current.recapture, 0) / outcomes.length).toFixed(3))
                      const previousAvg = Number((outcomes.reduce((a, r) => a + r.previous.recapture, 0) / outcomes.length).toFixed(3))
                      const delta = Number((currentAvg - previousAvg).toFixed(3))
                      return (
                        <>
                          <div className="card p-4">
                            <div className="text-xs text-gray-600">Avg Recapture (Current)</div>
                            <div className="text-2xl font-semibold">{currentAvg}</div>
                          </div>
                          <div className="card p-4">
                            <div className="text-xs text-gray-600">Avg Recapture (Previous)</div>
                            <div className="text-2xl font-semibold">{previousAvg}</div>
                          </div>
                          <div className="card p-4">
                            <div className="text-xs text-gray-600">Delta</div>
                            <div className={`text-2xl font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{delta}</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Coverage by rule for current vs previous */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const currentCoverage = rules.map(r => {
                        const count = outcomes.filter(o => o.current.ruleName === r.name).length
                        const pct = outcomes.length ? Number(((count / outcomes.length) * 100).toFixed(1)) : 0
                        return { name: r.name, pct }
                      })
                      const previousCoverage = previousRules.map(r => {
                        const count = outcomes.filter(o => o.previous.ruleName === r.name).length
                        const pct = outcomes.length ? Number(((count / outcomes.length) * 100).toFixed(1)) : 0
                        return { name: r.name, pct }
                      })
                      return (
                        <>
                          <div className="card p-4">
                            <div className="font-medium mb-2">Coverage (Current Rules)</div>
                            <div className="space-y-1">
                              {currentCoverage.map((c) => (
                                <div key={`cur-${c.name}`} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{c.name}</span>
                                  <span className="font-medium">{c.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="card p-4">
                            <div className="font-medium mb-2">Coverage (Previous Rules)</div>
                            <div className="space-y-1">
                              {previousCoverage.map((c) => (
                                <div key={`prev-${c.name}`} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{c.name}</span>
                                  <span className="font-medium">{c.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className="overflow-auto rounded border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 border-b">Customer</th>
                          <th className="text-left px-3 py-2 border-b">Segment</th>
                          <th className="text-left px-3 py-2 border-b">Current Decision</th>
                          <th className="text-left px-3 py-2 border-b">Current Recapture</th>
                          <th className="text-left px-3 py-2 border-b">Previous Decision</th>
                          <th className="text-left px-3 py-2 border-b">Previous Recapture</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcomes.map((o, i) => (
                          <tr key={`${o.current.customerId}-${i}`} className="odd:bg-white even:bg-slate-50">
                            <td className="px-3 py-2 border-b">{o.current.customerId}</td>
                            <td className="px-3 py-2 border-b">{customers[i]?.marketSegment}</td>
                            <td className="px-3 py-2 border-b">{o.current.ruleName ?? '-' } — {o.current.action}</td>
                            <td className="px-3 py-2 border-b">{o.current.recapture}</td>
                            <td className="px-3 py-2 border-b">{o.previous.ruleName ?? '-' } — {o.previous.action}</td>
                            <td className="px-3 py-2 border-b">{o.previous.recapture}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type ConditionEditorProps = {
  node: ConditionGroup | Condition
  onChange: (node: ConditionGroup | Condition) => void
}

function ConditionEditor({ node, onChange }: ConditionEditorProps) {
  if ((node as any).type === 'CONDITION') {
    const c = node as Condition
    return (
      <div className="rounded border p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
        <div className="md:col-span-2">
          <select className="border rounded px-2 py-2 w-full" value={c.field} onChange={e => onChange({ ...c, field: e.target.value })}>
            {FIELD_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <select className="border rounded px-2 py-2 w-full" value={c.operator} onChange={e => onChange({ ...c, operator: e.target.value })}>
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        {c.operator === 'BETWEEN' ? (
          <>
            <input className="border rounded px-2 py-2" placeholder="Value 1" value={c.value ?? ''} onChange={e => onChange({ ...c, value: e.target.value })} />
            <input className="border rounded px-2 py-2" placeholder="Value 2" value={c.value2 ?? ''} onChange={e => onChange({ ...c, value2: e.target.value })} />
          </>
        ) : (
          <input className="border rounded px-2 py-2 md:col-span-2" placeholder="Value (comma list for IN/OUT)" value={c.value ?? ''}
            onChange={e => onChange({ ...c, value: e.target.value })} />
        )}
        <div className="text-right">
          <button onClick={() => onChange({ ...c, field: 'scores.refiPropensity', operator: '>', value: 0.5 })} className="text-xs text-gray-500 underline">Reset</button>
        </div>
      </div>
    )
  }

  const g = node as ConditionGroup
  function updateChild(index: number, child: ConditionGroup | Condition) {
    const cloned = [...g.children]
    cloned[index] = child
    onChange({ ...g, children: cloned })
  }
  function addCondition() {
    onChange({ ...g, children: [...g.children, { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.5 } as any] })
  }
  function addGroup() {
    onChange({ ...g, children: [...g.children, { type: 'GROUP', op: 'AND', children: [] as any }] as any })
  }
  function removeIndex(index: number) {
    const cloned = [...g.children]
    cloned.splice(index, 1)
    onChange({ ...g, children: cloned })
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-gray-600">Group</span>
        <select className="border rounded px-2 py-1 text-sm" value={g.op} onChange={e => onChange({ ...g, op: e.target.value as 'AND' | 'OR' })}>
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button onClick={addCondition} className="rounded border px-2 py-1 text-sm hover:bg-gray-50">+ Condition</button>
        <button onClick={addGroup} className="rounded border px-2 py-1 text-sm hover:bg-gray-50">+ Group</button>
      </div>
      <div className="space-y-2">
        {g.children.map((child, idx) => (
          <div key={idx} className="space-y-2">
            <ConditionEditor node={child as any} onChange={(n)=>updateChild(idx, n)} />
            <div className="text-right">
              <button onClick={() => removeIndex(idx)} className="text-xs text-red-600">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
