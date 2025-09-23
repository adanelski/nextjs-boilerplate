"use client"
import { useState } from 'react'

export default function TestingPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    const res = await fetch('/api/test-run', { method: 'POST' })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Testing</h1>
      <button onClick={run} className="rounded border px-3 py-2 hover:bg-gray-50">Run against 100 sample customers</button>
      {loading && <div>Running...</div>}
      {result && (
        <div className="space-y-2">
          <div className="font-medium">Version: {result.version?.name}</div>
          <div className="text-sm text-gray-600">Rule matches (count):</div>
          <pre className="bg-gray-50 p-3 rounded border text-sm overflow-auto">{JSON.stringify(result.counts, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

