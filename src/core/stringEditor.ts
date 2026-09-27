import type { BracketStyle, GeneratorMode } from './generator'

export type TargetFormat = GeneratorMode
export type EditAction = 'strip' | 'reroll' | 'convert'

interface Token {
  name: string
  prefix: boolean
  weight: string | null
  levels: number
}

export interface EditOptions {
  action: EditAction
  format: TargetFormat
  min: number
  max: number
  bracketStyle?: BracketStyle
  bracketLevels?: number // 0 = random (or preserve existing creative depth on conversion)
}

const numeric = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)'
const standardPattern = new RegExp(`^\\((.+):(${numeric})\\)$`)
const naiPattern = new RegExp(`^(${numeric})::(.+?)\\s+::$`)
const bracketPairs: Record<BracketStyle, [string, string]> = {
  paren: ['(', ')'], curly: ['{', '}'], square: ['[', ']'],
}

function unwrapBrackets(input: string) {
  let value = input
  let levels = 0
  for (let depth = 0; depth < 5; depth++) {
    const pair = Object.values(bracketPairs).find(([open, close]) => value.startsWith(open) && value.endsWith(close))
    if (!pair) break
    value = value.slice(1, -1).trim()
    levels++
  }
  return { value, levels }
}

/** Parse outputs from all four generator formats, keeping artist names containing parentheses. */
export function parseArtistString(raw: string): Token[] {
  if (raw.length > 20000) throw new Error('内容过长，请分段处理（最多 20,000 字）。')
  const parts = raw.split(/[,，\n]+/).map((part) => part.trim()).filter(Boolean)
  if (!parts.length) throw new Error('先粘贴或输入一段画师串。')
  if (parts.length > 200) throw new Error('一次最多处理 200 个条目。')

  return parts.map((part, index) => {
    const prefix = /^artist\s*:/i.test(part)
    const content = prefix ? part.replace(/^artist\s*:\s*/i, '').trim() : part
    let weight: string | null = null
    let name = content
    let levels = 0
    const nai = naiPattern.exec(content)
    const standard = standardPattern.exec(content)
    if (nai) {
      weight = nai[1]!
      name = nai[2]!.trim()
    } else if (standard) {
      name = standard[1]!.trim()
      weight = standard[2]!
    } else {
      if (content.includes('::')) throw new Error(`第 ${index + 1} 项权重格式不完整，请检查「::」两侧。`)
      const result = unwrapBrackets(content)
      name = result.value
      levels = result.levels
    }
    if (!name) throw new Error(`第 ${index + 1} 项缺少画师名。`)
    if (name.length > 300) throw new Error(`第 ${index + 1} 项画师名过长（最多 300 字）。`)
    return { name, prefix, weight, levels }
  })
}

function unitRandom(random: () => number) {
  const value = random()
  return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0
}

function randomWeight(min: number, max: number, random: () => number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('权重范围必须是数字。')
  const low = Math.max(0, Math.min(2, Math.min(min, max)))
  const high = Math.max(0, Math.min(2, Math.max(min, max)))
  return (low + unitRandom(random) * (high - low)).toFixed(1)
}

export function editArtistString(input: string, options: EditOptions, random: () => number = Math.random) {
  const tokens = parseArtistString(input)
  if (options.action === 'reroll' && options.format === 'pure') {
    throw new Error('纯文本没有权重；请选择标准、NAI 或创意括号后重随。')
  }
  if (!['pure', 'standard', 'nai', 'creative'].includes(options.format)) throw new Error('不支持的目标格式。')
  const style = options.bracketStyle && options.bracketStyle in bracketPairs ? options.bracketStyle : 'paren'
  const [open, close] = bracketPairs[style]
  const chosenDepth = Number.isFinite(options.bracketLevels) ? Math.trunc(Math.max(0, Math.min(5, options.bracketLevels!))) : 0

  const text = tokens.map((token) => {
    const prefix = token.prefix ? 'artist:' : ''
    if (options.action === 'strip' || options.format === 'pure') return prefix + token.name
    if (options.format === 'creative') {
      const levels = chosenDepth || (options.action === 'convert' && token.levels > 0 ? token.levels : 1 + Math.floor(unitRandom(random) * 5))
      return prefix + `${open.repeat(levels)}${token.name}${close.repeat(levels)}`
    }
    const weight = options.action === 'reroll'
      ? randomWeight(options.min, options.max, random)
      : (token.weight ?? '1.0')
    return prefix + (options.format === 'nai'
      ? `${weight}::${token.name} ::`
      : `(${token.name}:${weight})`)
  }).join(', ')

  if (text.length > 20000) throw new Error('处理结果超过 20,000 字，请精简输入后重试。')
  return { text, names: tokens.map((token) => token.name), count: tokens.length }
}
