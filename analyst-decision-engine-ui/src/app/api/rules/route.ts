import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const latestVersion = await prisma.version.findFirst({
    where: {},
    orderBy: [{ createdAt: 'desc' }],
  })
  if (!latestVersion) return NextResponse.json({ rules: [] })

  const rules = await prisma.rule.findMany({
    where: { versionId: latestVersion.id },
    orderBy: { priority: 'asc' }
  })
  return NextResponse.json({ rules, version: latestVersion })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, priority, conditions, actions, versionId, isActive = true } = body
  const rule = await prisma.rule.create({
    data: { name, priority, conditions, actions, versionId, isActive }
  })
  return NextResponse.json({ rule })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...rest } = body
  const rule = await prisma.rule.update({ where: { id }, data: rest })
  return NextResponse.json({ rule })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') as string
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.rule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

