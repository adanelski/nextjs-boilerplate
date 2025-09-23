"use client"
import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { evaluateCondition, nlForCondition, ConditionNode } from './lib/evaluator'

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
type ConditionGroup = { type: 'GROUP'; op: 'AND' | 'OR'; children: Condition[] }

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

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
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
  const [outcomes, setOutcomes] = useState<{ customerId: string; ruleId?: string; ruleName?: string; action?: string }[] | null>(null)

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

  function addCondition() {
    if (!selectedRule) return
    const nextCond = { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.5 } as ConditionNode
    updateRule({ conditions: { ...(selectedRule.conditions as any), children: [...selectedRule.conditions.children, nextCond] } as any })
  }

  function updateCondition(idx: number, patch: any) {
    if (!selectedRule) return
    const cloned = [...selectedRule.conditions.children]
    cloned[idx] = { ...cloned[idx], ...patch }
    updateRule({ conditions: { ...selectedRule.conditions, children: cloned } as any })
  }

  function removeCondition(idx: number) {
    if (!selectedRule) return
    const cloned = [...selectedRule.conditions.children]
    cloned.splice(idx, 1)
    updateRule({ conditions: { ...selectedRule.conditions, children: cloned } as any })
  }

  function onDragEndConds(e: DragEndEvent) {
    if (!selectedRule) return
    const ids = selectedRule.conditions.children.map((_: any, i: number) => `${selectedRule.id}-cond-${i}`)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    const reordered = arrayMove(selectedRule.conditions.children as any[], oldIndex, newIndex)
    updateRule({ conditions: { ...selectedRule.conditions, children: reordered } as any })
  }

  function runTest() {
    const results = customers.map(cust => {
      let matched: Rule | undefined
      for (const r of rules.sort((a, b) => a.priority - b.priority)) {
        if (evaluateCondition(r.conditions as any, cust)) { matched = r; break }
      }
      return {
        customerId: cust.id,
        ruleId: matched?.id,
        ruleName: matched?.name,
        action: matched ? actionSummary(matched.action) : 'No Communication',
      }
    })
    setOutcomes(results)
  }

  const conditionsNL = selectedRule ? nlForCondition(selectedRule.conditions as any) : ''

  return (
    <div className="min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">Analyst Decision Engine (POC)</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => {}} className="rounded border px-3 py-2 hover:bg-gray-50">Save as Draft</button>
          <button onClick={() => {}} className="rounded border px-3 py-2 hover:bg-gray-50">Deploy to Production</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Rules (drag to reorder)</div>
            <button onClick={addRule} className="rounded border px-2 py-1 text-sm hover:bg-gray-50">Add Rule</button>
          </div>
          <DndContext onDragEnd={onDragEndRules}>
            <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {rules.map(r => (
                  <SortableItem key={r.id} id={r.id}>
                    <li className={`rounded border p-3 cursor-grab ${selectedRuleId === r.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setSelectedRuleId(r.id)}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.priority}. {r.name}</div>
                        <button onClick={(e) => { e.stopPropagation(); deleteRule(r.id) }} className="text-red-600 text-sm">Delete</button>
                      </div>
                    </li>
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedRule && (
            <div className="rounded border p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Rule Name</label>
                  <input className="border rounded px-3 py-2 w-full" value={selectedRule.name} onChange={e => updateRule({ name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Priority</label>
                  <input type="number" className="border rounded px-3 py-2 w-full" value={selectedRule.priority} onChange={e => updateRule({ priority: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Conditions (drag to reorder)</div>
                  <button onClick={addCondition} className="rounded border px-2 py-1 text-sm hover:bg-gray-50">Add Condition</button>
                </div>
                <DndContext onDragEnd={onDragEndConds}>
                  <SortableContext items={selectedRule.conditions.children.map((_, i) => `${selectedRule.id}-cond-${i}`)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {selectedRule.conditions.children.map((c, idx) => (
                        <SortableItem key={`${selectedRule.id}-cond-${idx}`} id={`${selectedRule.id}-cond-${idx}`}>
                          <li className="rounded border p-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                            <select className="border rounded px-2 py-2 md:col-span-2" value={(c as any).field} onChange={e => updateCondition(idx, { field: e.target.value })}>
                              {FIELD_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                            <select className="border rounded px-2 py-2" value={(c as any).operator} onChange={e => updateCondition(idx, { operator: e.target.value })}>
                              {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                            {(c as any).operator === 'BETWEEN' ? (
                              <>
                                <input className="border rounded px-2 py-2" placeholder="Value 1" value={(c as any).value ?? ''} onChange={e => updateCondition(idx, { value: e.target.value })} />
                                <input className="border rounded px-2 py-2" placeholder="Value 2" value={(c as any).value2 ?? ''} onChange={e => updateCondition(idx, { value2: e.target.value })} />
                              </>
                            ) : (
                              <input className="border rounded px-2 py-2 md:col-span-2" placeholder="Value" value={(c as any).value ?? ''} onChange={e => updateCondition(idx, { value: e.target.value })} />
                            )}
                            <button onClick={() => removeCondition(idx)} className="text-red-600 text-sm">Remove</button>
                          </li>
                        </SortableItem>
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
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
                      <select className="border rounded px-3 py-2 w-full" value={selectedRule.action.channel as any}
                        onChange={e => updateRule({ action: { ...(selectedRule.action as any), channel: e.target.value as Channel } as Action })}>
                        {(['SMS','EMAIL','MAIL','PORTAL'] as Channel[]).map(ch => <option key={ch} value={ch}>{ch}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm text-gray-600">Content ID</label>
                      <input className="border rounded px-3 py-2 w-full" placeholder="e.g., emails_123" value={(selectedRule.action as any).contentId}
                        onChange={e => updateRule({ action: { ...(selectedRule.action as any), contentId: e.target.value } as Action })} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600">Communication Type</label>
                      <select className="border rounded px-3 py-2 w-full" value={(selectedRule.action as any).communicationType}
                        onChange={e => updateRule({ action: { ...(selectedRule.action as any), communicationType: e.target.value as MlCommType } as Action })}>
                        {(['nurture','proactive','reactive'] as MlCommType[]).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm text-gray-600">Allowed Channels</label>
                      <div className="flex flex-wrap gap-2">
                        {(['SMS','EMAIL','MAIL','PORTAL'] as Channel[]).map(ch => {
                          const checked = (selectedRule.action as any).allowedChannels?.includes(ch)
                          return (
                            <label key={ch} className="inline-flex items-center gap-2 border rounded px-2 py-1 text-sm">
                              <input type="checkbox" checked={!!checked} onChange={(e) => {
                                const curr = new Set((selectedRule.action as any).allowedChannels || [])
                                if (e.target.checked) curr.add(ch); else curr.delete(ch)
                                updateRule({ action: { ...(selectedRule.action as any), allowedChannels: Array.from(curr) } as Action })
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

          <div className="rounded border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Testing</div>
              <button onClick={runTest} className="rounded border px-3 py-2 hover:bg-gray-50">Run against 100 sample customers</button>
            </div>
            {outcomes && (
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b">Customer</th>
                      <th className="text-left px-3 py-2 border-b">Segment</th>
                      <th className="text-left px-3 py-2 border-b">Matched Rule</th>
                      <th className="text-left px-3 py-2 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomes.map((o, i) => (
                      <tr key={`${o.customerId}-${i}`} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2 border-b">{o.customerId}</td>
                        <td className="px-3 py-2 border-b">{customers[i]?.marketSegment}</td>
                        <td className="px-3 py-2 border-b">{o.ruleName ?? '-'}</td>
                        <td className="px-3 py-2 border-b">{o.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
