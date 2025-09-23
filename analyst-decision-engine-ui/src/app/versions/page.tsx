"use client"
import { useEffect, useState } from 'react'

export default function VersionsPage() {
  const [versions, setVersions] = useState<any[]>([])
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  async function load() {
    const res = await fetch('/api/versions', { cache: 'no-store' })
    const data = await res.json()
    setVersions(data.versions)
  }

  useEffect(() => { load() }, [])

  async function createVersion() {
    await fetch('/api/versions', { method: 'POST', body: JSON.stringify({ name, note }) })
    setName(''); setNote(''); load()
  }

  async function deploy(id: string) {
    await fetch('/api/versions', { method: 'PUT', body: JSON.stringify({ id, action: 'deploy' }) })
    load()
  }

  async function rollback(id: string) {
    await fetch('/api/versions', { method: 'PUT', body: JSON.stringify({ id, action: 'rollback' }) })
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Versions</h1>
      <div className="rounded border p-4 space-y-2">
        <div className="font-medium">Create Draft</div>
        <div className="flex flex-col gap-2 md:flex-row">
          <input className="border rounded px-3 py-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Note" value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={createVersion} className="rounded border px-3 py-2 hover:bg-gray-50">Create</button>
        </div>
      </div>
      <ul className="space-y-2">
        {versions.map(v => (
          <li key={v.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{v.name} <span className="text-xs text-gray-500">({v.status})</span></div>
              <div className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => deploy(v.id)} className="rounded border px-2 py-1 hover:bg-gray-50 text-sm">Deploy</button>
              <button onClick={() => rollback(v.id)} className="rounded border px-2 py-1 hover:bg-gray-50 text-sm">Rollback</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

