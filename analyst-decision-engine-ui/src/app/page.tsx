import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Analyst Decision Engine</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/rules" className="rounded border p-4 hover:bg-gray-50">
          <div className="font-medium">Rules</div>
          <div className="text-sm text-gray-500">Manage rule priorities and navigate to builder</div>
        </Link>
        <Link href="/testing" className="rounded border p-4 hover:bg-gray-50">
          <div className="font-medium">Testing</div>
          <div className="text-sm text-gray-500">Run rules against 100 sample customers</div>
        </Link>
        <Link href="/versions" className="rounded border p-4 hover:bg-gray-50">
          <div className="font-medium">Versions</div>
          <div className="text-sm text-gray-500">Save drafts, deploy, rollback</div>
        </Link>
      </div>
    </div>
  )
}
