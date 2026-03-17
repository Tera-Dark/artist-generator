import type {
  DuplicatePromptMatch,
  PromptValidationIssue,
  PromptValidationSummary,
  SharedPrompt,
} from '@/types'

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'by',
  'for',
  'of',
  'the',
  'with',
  'to',
  'in',
])

const PLACEHOLDER_PATTERNS = [/^test/i, /^测试/, /^无题$/, /^untitled$/i]

export const PROMPT_RULES = {
  minTitleLength: 2,
  maxTitleLength: 40,
  minPromptLength: 12,
  maxPromptLength: 2400,
  minModelLength: 2,
  maxModelLength: 32,
  minDescriptionLength: 0,
  maxDescriptionLength: 240,
  minTags: 1,
  maxTags: 6,
  maxTagLength: 20,
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeTitle(value: string) {
  return normalizeWhitespace(value).toLowerCase()
}

function normalizePromptText(value: string) {
  return normalizeWhitespace(value)
    .replace(/[，、；;]/g, ', ')
    .toLowerCase()
}

function tokenizePrompt(value: string) {
  return normalizePromptText(value)
    .split(/[^a-z0-9_\-\u4e00-\u9fa5]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function pushIssue(
  issues: PromptValidationIssue[],
  severity: 'error' | 'warning',
  code: string,
  message: string,
) {
  issues.push({ code, severity, message })
}

export function sanitizePromptPayload(payload: Partial<SharedPrompt>) {
  const rawTags = Array.isArray(payload.tags) ? payload.tags : []
  const tags = Array.from(
    new Set(
      rawTags
        .map((tag) => normalizeWhitespace(String(tag || '')))
        .filter(Boolean),
    ),
  ).slice(0, PROMPT_RULES.maxTags)

  const description = normalizeWhitespace(String(payload.description || ''))

  return {
    ...payload,
    title: normalizeWhitespace(String(payload.title || '')),
    prompt: String(payload.prompt || '').trim(),
    model: normalizeWhitespace(String(payload.model || '')),
    tags,
    description: description.slice(0, PROMPT_RULES.maxDescriptionLength),
    image: normalizeWhitespace(String(payload.image || '')),
    username: normalizeWhitespace(String(payload.username || payload.author || '')),
  }
}

export function validatePromptPayload(payload: Partial<SharedPrompt>): PromptValidationSummary {
  const normalized = sanitizePromptPayload(payload)
  const issues: PromptValidationIssue[] = []

  const title = normalized.title || ''
  const prompt = normalized.prompt || ''
  const model = normalized.model || ''
  const description = normalized.description || ''
  const tags = normalized.tags || []
  const image = normalized.image || ''

  if (title.length < PROMPT_RULES.minTitleLength) {
    pushIssue(issues, 'error', 'title_required', '标题至少需要 2 个字符。')
  }
  if (title.length > PROMPT_RULES.maxTitleLength) {
    pushIssue(issues, 'error', 'title_too_long', `标题请控制在 ${PROMPT_RULES.maxTitleLength} 个字符以内。`)
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(title))) {
    pushIssue(issues, 'warning', 'title_placeholder', '标题看起来像测试或占位文案，建议改成更明确的主题名。')
  }

  if (prompt.length < PROMPT_RULES.minPromptLength) {
    pushIssue(issues, 'error', 'prompt_too_short', 'Prompt 内容太短，无法形成可复用的分享。')
  }
  if (prompt.length > PROMPT_RULES.maxPromptLength) {
    pushIssue(issues, 'error', 'prompt_too_long', `Prompt 请控制在 ${PROMPT_RULES.maxPromptLength} 个字符以内。`)
  }
  if (!/[,\n]/.test(prompt) && tokenizePrompt(prompt).length < 5) {
    pushIssue(issues, 'warning', 'prompt_low_detail', 'Prompt 看起来信息量偏少，建议补充风格、主体、构图或光影细节。')
  }

  if (model.length < PROMPT_RULES.minModelLength) {
    pushIssue(issues, 'error', 'model_required', '请填写适用模型。')
  }
  if (model.length > PROMPT_RULES.maxModelLength) {
    pushIssue(issues, 'warning', 'model_too_long', '模型名过长，建议使用更简洁的版本号或系列名。')
  }

  if (tags.length < PROMPT_RULES.minTags) {
    pushIssue(issues, 'error', 'tags_required', '至少添加 1 个标签，方便后续筛选。')
  }
  if (tags.length > PROMPT_RULES.maxTags) {
    pushIssue(issues, 'warning', 'tags_too_many', `标签建议不超过 ${PROMPT_RULES.maxTags} 个。`)
  }
  if (tags.some((tag) => tag.length > PROMPT_RULES.maxTagLength)) {
    pushIssue(issues, 'warning', 'tag_too_long', '标签名称过长，建议缩短到 20 个字符以内。')
  }
  if (tags.some((tag) => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(tag)))) {
    pushIssue(issues, 'warning', 'tag_placeholder', '标签里包含测试类词汇，建议改成内容标签。')
  }

  if (description.length > PROMPT_RULES.maxDescriptionLength) {
    pushIssue(issues, 'warning', 'description_too_long', '描述过长，建议控制在 240 个字符以内。')
  }

  if (image && !/^https?:\/\//i.test(image)) {
    pushIssue(issues, 'warning', 'image_url_invalid', '图片链接建议使用可公开访问的 http(s) 地址。')
  }

  return {
    issues,
    fingerprint: buildPromptFingerprint(normalized),
    normalizedTitle: normalizeTitle(title),
  }
}

export function buildPromptFingerprint(payload: Partial<SharedPrompt>) {
  const normalized = sanitizePromptPayload(payload)
  const title = normalizeTitle(normalized.title || '')
  const promptTokens = tokenizePrompt(normalized.prompt || '')
  const head = promptTokens.slice(0, 12).join('|')
  const tags = (normalized.tags || []).map((tag) => tag.toLowerCase()).sort().join('|')

  return [title, head, tags].filter(Boolean).join('::')
}

export function findDuplicatePromptMatches(
  target: Partial<SharedPrompt>,
  candidates: Array<Partial<SharedPrompt> & { id?: string; title?: string }>,
  source: 'published' | 'submission',
  currentId?: string,
) {
  const normalizedTarget = sanitizePromptPayload(target)
  const targetTitle = normalizeTitle(normalizedTarget.title || '')
  const targetTokens = new Set(tokenizePrompt(normalizedTarget.prompt || ''))

  const matches: DuplicatePromptMatch[] = []

  candidates.forEach((candidate) => {
    if (!candidate.id || candidate.id === currentId) return

    const normalizedCandidate = sanitizePromptPayload(candidate)
    const candidateTitle = normalizeTitle(normalizedCandidate.title || '')
    const candidateTokens = new Set(tokenizePrompt(normalizedCandidate.prompt || ''))

    let score = 0
    if (targetTitle && candidateTitle && targetTitle === candidateTitle) {
      score += 0.6
    }

    const intersection = [...targetTokens].filter((token) => candidateTokens.has(token)).length
    const union = new Set([...targetTokens, ...candidateTokens]).size
    const jaccard = union > 0 ? intersection / union : 0
    score += jaccard * 0.4

    if (score >= 0.65) {
      matches.push({
        id: candidate.id,
        title: candidate.title || 'Untitled',
        score: Number(score.toFixed(2)),
        source,
      })
    }
  })

  return matches.sort((a, b) => b.score - a.score).slice(0, 3)
}
