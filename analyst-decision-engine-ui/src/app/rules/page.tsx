"use client"
import { useEffect, useState } from 'react'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'

type Rule = {
  id: string
  name: string
  priority: number
  isActive: boolean
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/rules', { cache: 'no-store' })
    const data = await res.json()
    setRules(data.rules)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteRule(id: string) {
    await fetch(`/api/rules?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rules</h1>
        <a href="/rules/new" className="inline-flex items-center gap-2 rounded border px-3 py-2 hover:bg-gray-50"><Plus size={16}/> New Rule</a>
      </div>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {rules.map(r => (
            <li key={r.id} className="flex items-center justify-between rounded border p-3">
              <div className="flex items-center gap-3">
                <GripVertical size={18} className="text-gray-400"/>
                <div>
                  <div className="font-medium">{r.priority}. {r.name}</div>
                  <div className="text-xs text-gray-500">{r.isActive ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/rules/${r.id}`} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-gray-50 text-sm"><Pencil size={14}/> Edit</a>
                <button onClick={() => deleteRule(r.id)} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-gray-50 text-sm text-red-600"><Trash2 size={14}/> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

