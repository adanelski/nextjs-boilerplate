type JsonValue = any

export type ConditionNode =
  | { type: 'CONDITION'; field: string; operator: string; value?: JsonValue; value2?: JsonValue }
  | { type: 'GROUP'; op: 'AND' | 'OR' | 'NOT'; children: ConditionNode[] }

export function getValueByPath(data: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), data)
}

function compareValues(left: any, operator: string, right?: any, right2?: any): boolean {
  switch (operator) {
    case '>': return left > right
    case '<': return left < right
    case '=': return left === right
    case '≠': return left !== right
    case 'BETWEEN': return left >= right && left <= right2
    case 'CONTAINS': return typeof left === 'string' && typeof right === 'string' && left.toLowerCase().includes(right.toLowerCase())
    case 'STARTS WITH': return typeof left === 'string' && typeof right === 'string' && left.toLowerCase().startsWith((right as string).toLowerCase())
    case 'EXISTS': return left !== undefined && left !== null
    case 'NOT EXISTS': return left === undefined || left === null
    case 'TRUE': return Boolean(left) === true
    case 'FALSE': return Boolean(left) === false
    case 'IN': return Array.isArray(right) && right.includes(left)
    case 'OUT': return Array.isArray(right) && !right.includes(left)
    case 'AGE >': {
      const dob = new Date(left)
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      return age > (right as number)
    }
    case 'AGE <': {
      const dob = new Date(left)
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      return age < (right as number)
    }
    case 'MONTHS AGO >': {
      const d = new Date(left)
      const monthsAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo > (right as number)
    }
    default:
      return false
  }
}

export function evaluateCondition(node: ConditionNode, customer: any): boolean {
  if (node.type === 'CONDITION') {
    const left = getValueByPath(customer, node.field)
    return compareValues(left, node.operator, node.value, node.value2)
  }
  if (node.op === 'NOT') {
    return !node.children.some(child => evaluateCondition(child, customer))
  }
  if (node.op === 'AND') {
    return node.children.every(child => evaluateCondition(child, customer))
  }
  return node.children.some(child => evaluateCondition(child, customer))
}

export function nlForCondition(node: ConditionNode): string {
  if (node.type === 'CONDITION') {
    const field = node.field.replaceAll('.', ' ')
    if (node.operator === 'BETWEEN') return `${field} between ${node.value} and ${node.value2}`
    return `${field} ${node.operator} ${node.value ?? ''}`.trim()
  }
  const joiner = node.op === 'AND' ? ' and ' : node.op === 'OR' ? ' or ' : ' not '
  const inner = node.children.map(nlForCondition).join(joiner)
  if (node.op === 'NOT') return `not (${inner})`
  return `(${inner})`
}

