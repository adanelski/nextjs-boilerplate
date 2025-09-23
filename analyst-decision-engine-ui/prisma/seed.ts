import { PrismaClient, VersionStatus } from '../src/generated/prisma'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function generateTestCustomers(count: number) {
  const customers: any[] = []
  for (let i = 0; i < count; i++) {
    const fico = 600 + Math.floor(Math.random() * 200)
    const refiPropensity = Number((Math.random()).toFixed(2))
    const currentUpb = Math.floor(50000 + Math.random() * 900000)
    const purchaseIntent = Number((Math.random()).toFixed(2))
    const churnRisk = Number((Math.random()).toFixed(2))
    const emailConsent = Math.random() > 0.2
    const tcpAFlag = Math.random() > 0.9
    const segment = ["Actively Shopping", "Entering Market", "Not in Market"][Math.floor(Math.random()*3)]
    customers.push({
      id: `CUST-${i + 1}`,
      firstName: `Test${i + 1}`,
      lastName: `User${i + 1}`,
      dateOfBirth: `198${i % 10}-0${(i % 9) + 1}-15`,
      contact: {
        mobilePhone: Math.random() > 0.4,
        homePhone: Math.random() > 0.6,
        emailAddress: Math.random() > 0.3,
        emailConsent,
        tcpaFlag: tcpAFlag,
        optStatus: Math.random() > 0.5 ? 'IN' : 'OUT'
      },
      property: {
        state: ["CA", "TX", "FL", "NY", "WA"][i % 5],
        city: ["Los Angeles", "Austin", "Miami", "Buffalo", "Seattle"][i % 5],
        zip: String(90000 + (i % 500)),
        value: Math.floor(200000 + Math.random() * 1000000),
        type: ["SFR", "Condo", "Townhouse"][i % 3]
      },
      loan: {
        currentUpb,
        remainingBalance: currentUpb - Math.floor(Math.random() * 20000),
        currentRate: Number((2 + Math.random() * 5).toFixed(2)),
        originalAmount: currentUpb + Math.floor(Math.random() * 100000),
        ficoAtOrigination: fico,
        loanTerm: [180, 240, 360][i % 3],
        remainingTerm: [120, 220, 340][i % 3],
        originationDate: `201${i % 10}-0${(i % 9) + 1}-01`,
        occupancyType: ["Owner", "Investor"][i % 2],
        paymentType: ["Fixed", "ARM"][i % 2],
        biweekly: Math.random() > 0.8,
        impound: Math.random() > 0.7,
        priorLates24m: Math.floor(Math.random() * 3),
        forbearance: Math.random() > 0.95,
        inBankruptcy: Math.random() > 0.98,
        lossMitigation: Math.random() > 0.98,
        foreclosure: Math.random() > 0.99,
        ceaseDesist: Math.random() > 0.99,
        currentFlag: Math.random() > 0.85,
        payoffRequests: Math.floor(Math.random() * 3),
        concurrentSecond: Math.random() > 0.2
      },
      payment: {
        monthlyPI: Math.floor(900 + Math.random() * 4500),
        taxesInsurance: Math.floor(200 + Math.random() * 1000),
        pmi: Math.random() > 0.7 ? Math.floor(50 + Math.random() * 200) : null,
        currentApr: Number((2 + Math.random() * 5).toFixed(2))
      },
      engagement: {
        websiteRegistered: Math.random() > 0.5,
        daysSinceLastContact: Math.floor(Math.random() * 365),
        previousResponseRate: Number((Math.random()).toFixed(2))
      },
      scores: {
        refiPropensity,
        churnRisk,
        purchaseIntent,
        expectedValue: Math.floor(Math.random() * 10000),
        msrLtv: Math.floor(Math.random() * 90000)
      },
      marketSegment: segment
    })
  }
  return customers
}

async function main() {
  const version = await prisma.version.create({
    data: {
      name: 'Initial Draft',
      note: 'Seeded initial version',
      status: VersionStatus.DRAFT,
    }
  })

  await prisma.rule.create({
    data: {
      name: 'High Value Refinance Opportunities',
      priority: 1,
      isActive: true,
      versionId: version.id,
      conditions: {
        type: 'GROUP',
        op: 'AND',
        children: [
          { type: 'CONDITION', field: 'scores.refiPropensity', operator: '>', value: 0.6 },
          { type: 'CONDITION', field: 'loan.currentUpb', operator: '>', value: 300000 },
          { type: 'CONDITION', field: 'loan.ficoAtOrigination', operator: '>', value: 720 }
        ]
      },
      actions: {
        mode: 'SPECIFIC',
        items: [
          { type: 'EMAIL', templateId: '5678', sendTime: 'IMMEDIATE' },
          { type: 'TASK', priority: 'HIGH', assignee: 'LOAN_OFFICER_POOL' }
        ]
      }
    }
  })

  const customers = generateTestCustomers(100)
  const targetPath = path.join(process.cwd(), 'src', 'data')
  fs.mkdirSync(targetPath, { recursive: true })
  fs.writeFileSync(path.join(targetPath, 'test-customers.json'), JSON.stringify(customers, null, 2))
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Seed complete')
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

