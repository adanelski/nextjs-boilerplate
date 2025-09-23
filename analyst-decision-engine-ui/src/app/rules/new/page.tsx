"use client"
import { useEffect, useState } from 'react'

export default function NewRulePage() {
  const [versionId, setVersionId] = useState<string | null>(null)
  const [name, setName] = useState('New Rule')
  const [priority, setPriority] = useState(1)
  const [conditions, setConditions] = useState<any>({ type: 'GROUP', op: 'AND', children: [] })
  const [actions, setActions] = useState<any>({ mode: 'SPECIFIC', items: [] })

  useEffect(() => {
    fetch('/api/versions').then(r => r.json()).then(data => {
      const latest = data.versions?.[0]
      if (latest) setVersionId(latest.id)
    })
  }, [])

  async function create() {
    await fetch('/api/rules', { method: 'POST', body: JSON.stringify({ name, priority, conditions, actions, versionId }) })
    window.location.href = '/rules'
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">New Rule</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Name</label>
          <input className="border rounded px-3 py-2 w-full" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Priority</label>
          <input type="number" className="border rounded px-3 py-2 w-full" value={priority} onChange={e => setPriority(Number(e.target.value))} />
        </div>
      </div>
      <button onClick={create} className="rounded border px-3 py-2 hover:bg-gray-50">Create</button>
    </div>
  )
}

