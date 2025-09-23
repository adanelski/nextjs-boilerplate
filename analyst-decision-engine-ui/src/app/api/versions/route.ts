import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VersionStatus } from '@/generated/prisma'

export async function GET() {
  const versions = await prisma.version.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ versions })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, note } = body
  const v = await prisma.version.create({ data: { name, note, status: VersionStatus.DRAFT } })
  return NextResponse.json({ version: v })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, action } = body
  if (action === 'deploy') {
    // mark all as DRAFT, then set this one DEPLOYED
    await prisma.version.updateMany({ data: { status: VersionStatus.DRAFT, deployedAt: null } })
    const v = await prisma.version.update({ where: { id }, data: { status: VersionStatus.DEPLOYED, deployedAt: new Date() } })
    await prisma.auditEvent.create({ data: { eventType: 'DEPLOY', message: `Deployed version ${id}`, versionId: id } })
    return NextResponse.json({ version: v })
  }
  if (action === 'rollback') {
    const v = await prisma.version.findUnique({ where: { id } })
    if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.version.updateMany({ data: { status: VersionStatus.DRAFT, deployedAt: null } })
    const vr = await prisma.version.update({ where: { id }, data: { status: VersionStatus.DEPLOYED, deployedAt: new Date() } })
    await prisma.auditEvent.create({ data: { eventType: 'ROLLBACK', message: `Rolled back to ${id}`, versionId: id } })
    return NextResponse.json({ version: vr })
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}

