// Safe formula engine. No eval() of raw JS: the expression is tokenized and
// parsed into a small AST, then interpreted. Supporting + - * /, comparisons,
// parentheses, unary minus, and the SUM / IF / CONCAT functions.

const FUNCTIONS = new Set(['SUM', 'IF', 'CONCAT'])
const NO_FORMULA_REF = 'formula'

// ---------------------------------------------------------------- tokenize

function tokenize(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    // Field reference {Name}
    if (ch === '{') {
      const end = src.indexOf('}', i)
      if (end === -1) throw new Error('unterminated { in field reference')
      tokens.push({ type: 'field', value: src.slice(i + 1, end).trim() })
      i = end + 1
      continue
    }
    // String literal '...'
    if (ch === "'") {
      let j = i + 1
      let out = ''
      while (j < src.length && src[j] !== "'") {
        out += src[j]
        j += 1
      }
      if (src[j] !== "'") throw new Error("unterminated string literal (use single quotes)")
      tokens.push({ type: 'string', value: out })
      i = j + 1
      continue
    }
    // Number
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1
      tokens.push({ type: 'number', value: parseFloat(src.slice(i, j)) })
      i = j
      continue
    }
    // Identifier (functions / true / false)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1
      tokens.push({ type: 'ident', value: src.slice(i, j) })
      i = j
      continue
    }
    // Two-character operators
    if (['<=', '>=', '!='].includes(src.slice(i, i + 2))) {
      tokens.push({ type: 'op', value: src.slice(i, i + 2) })
      i += 2
      continue
    }
    if (['+', '-', '*', '/', '(', ')', ',', '<', '>', '=', '!'].includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i += 1
      continue
    }
    throw new Error(`unexpected character "${ch}"`)
  }
  return tokens
}

// ---------------------------------------------------------------- parse

function parseFormulaInternal(src) {
  const tokens = tokenize(src)
  let pos = 0

  function peek() {
    return tokens[pos]
  }
  function next() {
    return tokens[pos++]
  }
  function expectOp(value) {
    const t = next()
    if (!t || t.type !== 'op' || t.value !== value) {
      throw new Error(`expected "${value}"`)
    }
  }

  const COMPARE_OPS = ['<', '>', '<=', '>=', '=', '!=']

  function parseComparison() {
    let left = parseAdditive()
    while (peek() && peek().type === 'op' && COMPARE_OPS.includes(peek().value)) {
      const op = next().value
      const right = parseAdditive()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  function parseAdditive() {
    let left = parseMultiplicative()
    while (peek() && peek().type === 'op' && ['+', '-'].includes(peek().value)) {
      const op = next().value
      const right = parseMultiplicative()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  function parseMultiplicative() {
    let left = parseUnary()
    while (peek() && peek().type === 'op' && ['*', '/'].includes(peek().value)) {
      const op = next().value
      const right = parseUnary()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && peek().value === '-') {
      next()
      return { type: 'unary', op: '-', arg: parseUnary() }
    }
    return parsePrimary()
  }

  function parsePrimary() {
    const t = peek()
    if (!t) throw new Error('unexpected end of formula')
    if (t.type === 'number') {
      next()
      return { type: 'number', value: t.value }
    }
    if (t.type === 'string') {
      next()
      return { type: 'string', value: t.value }
    }
    if (t.type === 'field') {
      next()
      return { type: 'field', name: t.value }
    }
    if (t.type === 'ident') {
      const name = t.value
      next()
      if (name === 'true') return { type: 'bool', value: true }
      if (name === 'false') return { type: 'bool', value: false }
      expectOp('(')
      const args = []
      if (!(peek() && peek().type === 'op' && peek().value === ')')) {
        args.push(parseComparison())
        while (peek() && peek().type === 'op' && peek().value === ',') {
          next()
          args.push(parseComparison())
        }
      }
      expectOp(')')
      const upper = name.toUpperCase()
      if (!FUNCTIONS.has(upper)) {
        throw new Error(`unknown function "${name}"`)
      }
      return { type: 'call', name: upper, args }
    }
    if (t.type === 'op' && t.value === '(') {
      next()
      const inner = parseComparison()
      expectOp(')')
      return inner
    }
    throw new Error(`unexpected token "${t.type}"`)
  }

  if (tokens.length === 0) throw new Error('empty formula')
  const ast = parseComparison()
  if (pos < tokens.length) {
    throw new Error('unexpected trailing characters')
  }
  return ast
}

export function parseFormula(src) {
  if (typeof src !== 'string' || !src.trim()) throw new Error('empty formula')
  return parseFormulaInternal(src)
}

// Names of fields referenced by an AST (used for validation).
export function formulaFieldNames(ast) {
  const names = new Set()
  function walk(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'field') {
      names.add(node.name)
      return
    }
    for (const key of ['left', 'right', 'arg', 'args']) {
      const value = node[key]
      if (Array.isArray(value)) value.forEach(walk)
      else walk(value)
    }
  }
  walk(ast)
  return [...names]
}

// Returns an error string, or null when the formula is valid for these fields.
// `selfName` (optional) is the name of the field the formula lives on, which it
// must not reference.
export function validateFormula(fields, expr, selfName) {
  if (typeof expr !== 'string' || !expr.trim()) return 'formula expression is required'
  let ast
  try {
    ast = parseFormula(expr)
  } catch (err) {
    return `invalid formula: ${err.message}`
  }
  for (const name of formulaFieldNames(ast)) {
    if (selfName && name === selfName) {
      return `formula cannot reference itself ("${name}")`
    }
    const field = fields.find((f) => f.name === name)
    if (!field) return `formula references unknown field "${name}"`
    if (field.type === NO_FORMULA_REF) {
      return `formula cannot reference another formula field ("${name}")`
    }
  }
  return null
}

// ---------------------------------------------------------------- evaluate

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function toNum(value) {
  if (isNum(value)) return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined || value === '') return 0
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

function truthy(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return value !== null && value !== undefined && String(value).length > 0
}

function compare(a, b) {
  if (isNum(a) && isNum(b)) return a - b
  const sa = String(a ?? '')
  const sb = String(b ?? '')
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

function equal(a, b) {
  if (isNum(a) && isNum(b)) return a === b
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b
  return String(a ?? '') === String(b ?? '')
}

function flatten(value) {
  return Array.isArray(value) ? value.flatMap(flatten) : value
}

export function evaluateFormula(ast, resolveField) {
  function evalNode(node) {
    switch (node.type) {
      case 'number':
        return node.value
      case 'string':
        return node.value
      case 'bool':
        return node.value
      case 'field':
        return resolveField(node.name)
      case 'unary': {
        const value = evalNode(node.arg)
        return isNum(value) ? -value : null
      }
      case 'binary': {
        const left = evalNode(node.left)
        const right = evalNode(node.right)
        switch (node.op) {
          case '+':
            return toNum(left) + toNum(right)
          case '-':
            return toNum(left) - toNum(right)
          case '*':
            return toNum(left) * toNum(right)
          case '/': {
            const divisor = toNum(right)
            return divisor === 0 ? null : toNum(left) / divisor
          }
          case '=':
            return equal(left, right)
          case '!=':
            return !equal(left, right)
          case '<':
            return compare(left, right) < 0
          case '<=':
            return compare(left, right) <= 0
          case '>':
            return compare(left, right) > 0
          case '>=':
            return compare(left, right) >= 0
          default:
            return null
        }
      }
      case 'call': {
        if (node.name === 'CONCAT') {
          return node.args.map((a) => String(evalNode(a) ?? '')).join('')
        }
        if (node.name === 'IF') {
          if (node.args.length !== 3) throw new Error('IF requires 3 arguments')
          return truthy(evalNode(node.args[0]))
            ? evalNode(node.args[1])
            : evalNode(node.args[2])
        }
        if (node.name === 'SUM') {
          let total = 0
          for (const arg of node.args) {
            const value = flatten(evalNode(arg))
            if (isNum(value)) {
              total += value
            } else if (Array.isArray(value)) {
              total += value.filter(isNum).reduce((sum, n) => sum + n, 0)
            } else {
              total += toNum(value)
            }
          }
          return total
        }
        throw new Error(`unknown function "${node.name}"`)
      }
      default:
        return null
    }
  }
  try {
    return evalNode(ast)
  } catch {
    return null
  }
}

// Given a table's fields and a record's data, returns data with every formula
// field's computed value filled in. The input object is never mutated.
export function computeFormulaValues(fields, data) {
  const formulas = fields.filter(
    (f) => f.type === 'formula' && typeof f.options?.formula === 'string',
  )
  if (formulas.length === 0) return data

  const byName = new Map(fields.map((f) => [f.name, f]))
  const result = { ...data }
  for (const field of formulas) {
    try {
      const ast = parseFormula(field.options.formula)
      result[field.id] = evaluateFormula(ast, (name) => {
        const referenced = byName.get(name)
        return referenced ? result[referenced.id] : null
      })
    } catch {
      result[field.id] = null
    }
  }
  return result
}