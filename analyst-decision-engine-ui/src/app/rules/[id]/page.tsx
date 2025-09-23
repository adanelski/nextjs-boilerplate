"use client"
import { useEffect, useMemo, useState } from 'react'
import { nlForCondition } from '@/lib/evaluator'

type Rule = {
  id: string
  name: string
  priority: number
  conditions: any
  actions: any
}

export default function RuleDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const [rule, setRule] = useState<Rule | null>(null)
  const [name, setName] = useState('')
  const [priority, setPriority] = useState(1)
  const [conditions, setConditions] = useState<any>({ type: 'GROUP', op: 'AND', children: [] })
  const [actions, setActions] = useState<any>({ mode: 'SPECIFIC', items: [] })

  async function load() {
    const res = await fetch('/api/rules')
    const data = await res.json()
    const found = data.rules.find((r: Rule) => r.id === id)
    if (found) {
      setRule(found)
      setName(found.name)
      setPriority(found.priority)
      setConditions(found.conditions)
      setActions(found.actions)
    }
  }
  useEffect(() => { load() }, [id])

  const nl = useMemo(() => nlForCondition(conditions), [conditions])

  async function save() {
    await fetch('/api/rules', { method: 'PUT', body: JSON.stringify({ id, name, priority, conditions, actions }) })
    load()
  }

  function addCondition() {
    setConditions((prev: any) => ({
      ...prev,
      children: [
        ...prev.children,
        { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.6 }
      ]
    }))
  }

  function addAction() {
    setActions((prev: any) => ({
      ...prev,
      mode: 'SPECIFIC',
      items: [...(prev.items || []), { type: 'EMAIL', templateId: '5678', sendTime: 'IMMEDIATE' }]
    }))
  }

  if (!rule) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Edit Rule</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Name</label>
            <input className="border rounded px-3 py-2 w-full" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Priority</label>
            <input type="number" className="border rounded px-3 py-2 w-full" value={priority} onChange={e => setPriority(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Conditions</div>
              <button onClick={addCondition} className="rounded border px-2 py-1 hover:bg-gray-50 text-sm">Add condition</button>
            </div>
            <pre className="bg-gray-50 p-3 rounded border text-sm overflow-auto">{JSON.stringify(conditions, null, 2)}</pre>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Actions</div>
              <button onClick={addAction} className="rounded border px-2 py-1 hover:bg-gray-50 text-sm">Add action</button>
            </div>
            <pre className="bg-gray-50 p-3 rounded border text-sm overflow-auto">{JSON.stringify(actions, null, 2)}</pre>
          </div>
          <button onClick={save} className="rounded border px-3 py-2 hover:bg-gray-50">Save</button>
        </div>
        <div className="space-y-2">
          <div className="font-medium">Natural Language Preview</div>
          <div className="text-sm text-gray-700">{nl}</div>
        </div>
      </div>
    </div>
  )
}

