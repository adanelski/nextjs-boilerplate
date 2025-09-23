import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { evaluateCondition } from '@/lib/evaluator'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { versionId } = body

  const version = versionId
    ? await prisma.version.findUnique({ where: { id: versionId } })
    : await prisma.version.findFirst({ orderBy: { createdAt: 'desc' } })
  if (!version) return NextResponse.json({ error: 'No version found' }, { status: 404 })

  const rules = await prisma.rule.findMany({ where: { versionId: version.id }, orderBy: { priority: 'asc' } })
  const testPath = path.join(process.cwd(), 'src', 'data', 'test-customers.json')
  const customers = JSON.parse(fs.readFileSync(testPath, 'utf-8'))

  const outcomes: any[] = []
  customers.forEach((cust: any) => {
    for (const rule of rules) {
      if (evaluateCondition(rule.conditions as any, cust)) {
        outcomes.push({ customerId: cust.id, ruleId: rule.id, actions: rule.actions })
        break
      }
    }
  })

  const counts: Record<string, number> = {}
  for (const o of outcomes) counts[o.ruleId] = (counts[o.ruleId] ?? 0) + 1

  return NextResponse.json({ version, counts, outcomes })
}

