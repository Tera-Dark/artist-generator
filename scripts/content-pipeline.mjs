import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const cwd = process.cwd()
const dataDir = path.join(cwd, 'public', 'data')
const args = new Set(process.argv.slice(2))
const shouldWrite = args.has('--write')
const shouldCheck = args.has('--check') || !shouldWrite

const RULES = {
  minTitleLength: 2,
  maxTitleLength: 40,
  minPromptLength: 12,
  maxPromptLength: 2400,
  minTags: 1,
  maxTags: 6,
}

const PLACEHOLDER_PATTERNS = [/^test/i, /^测试/, /^无题$/, /^untitled$/i]

function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function normalizeTitle(value = '') {
  return normalizeWhitespace(value).toLowerCase()
}

function sanitizePrompt(item) {
  const tags = Array.from(
    new Set(
      (Array.isArray(item.tags) ? item.tags : [])
        .map((tag) => normalizeWhitespace(tag))
        .filter(Boolean),
    ),
  ).slice(0, RULES.maxTags)

  return {
    ...item,
    title: normalizeWhitespace(item.title),
    prompt: String(item.prompt || '').trim(),
    model: normalizeWhitespace(item.model),
    description: normalizeWhitespace(item.description),
    image: normalizeWhitespace(item.image),
    username: normalizeWhitespace(item.username || item.author || ''),
    tags,
  }
}

function validatePrompt(item) {
  const prompt = sanitizePrompt(item)
  const errors = []
  const warnings = []

  if (!prompt.id) errors.push('缺少 id')
  if (!(prompt.title || '')) errors.push('标题为空')
  if ((prompt.title || '').length < RULES.minTitleLength) warnings.push('标题过短')
  if ((prompt.title || '').length > RULES.maxTitleLength) warnings.push('标题过长')
  if (!(prompt.prompt || '')) errors.push('prompt 为空')
  if ((prompt.prompt || '').length < RULES.minPromptLength) warnings.push('prompt 过短')
  if ((prompt.prompt || '').length > RULES.maxPromptLength) warnings.push('prompt 过长')
  if (!(prompt.model || '')) errors.push('模型为空')
  if ((prompt.tags || []).length < RULES.minTags) errors.push('标签为空')
  if ((prompt.tags || []).length > RULES.maxTags) warnings.push('标签过多')
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(prompt.title || ''))) {
    warnings.push('标题像测试或占位文案')
  }

  return { prompt, errors, warnings }
}

function buildFeatured(prompts) {
  const now = Date.now()
  return [...prompts]
    .sort((a, b) => {
      const aScore =
        (a.upvotes || 0) * 10 +
        (a.views || 0) * 0.02 +
        Math.max(0, 365 - (now - (a.created_at || now)) / 86400000)
      const bScore =
        (b.upvotes || 0) * 10 +
        (b.views || 0) * 0.02 +
        Math.max(0, 365 - (now - (b.created_at || now)) / 86400000)
      return bScore - aScore
    })
    .slice(0, 8)
}

function readManualFeaturedIds(existingFeatured) {
  if (!existingFeatured) return []
  if (Array.isArray(existingFeatured)) return []
  return Array.isArray(existingFeatured.manualIds)
    ? existingFeatured.manualIds.filter((id) => typeof id === 'string')
    : []
}

function buildTags(prompts) {
  const counts = new Map()
  prompts.forEach((prompt) => {
    ;(prompt.tags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJson(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`
  await fs.writeFile(filePath, content, 'utf8')
}

async function main() {
  const indexPath = path.join(dataDir, 'index.json')
  const promptsPath = path.join(dataDir, 'prompts.json')
  const featuredPath = path.join(dataDir, 'featured.json')
  const tagsPath = path.join(dataDir, 'tags.json')

  const index = await readJson(indexPath)
  const chunkNames = Array.isArray(index.chunks) ? index.chunks : []
  const chunks = await Promise.all(
    chunkNames.map(async (chunkName) => {
      const filePath = path.join(dataDir, chunkName)
      const prompts = await readJson(filePath)
      return {
        chunkName,
        filePath,
        prompts: Array.isArray(prompts) ? prompts : [],
      }
    }),
  )

  const allPrompts = chunks.flatMap((chunk) => chunk.prompts)
  const sanitizedPrompts = allPrompts.map((item) => validatePrompt(item))

  const errors = []
  const warnings = []
  const titleMap = new Map()
  const idSet = new Set()

  sanitizedPrompts.forEach(({ prompt, errors: promptErrors, warnings: promptWarnings }) => {
    if (idSet.has(prompt.id)) {
      errors.push(`重复 id: ${prompt.id}`)
    }
    idSet.add(prompt.id)

    const normalizedTitle = normalizeTitle(prompt.title)
    if (normalizedTitle) {
      const existing = titleMap.get(normalizedTitle)
      if (existing && existing !== prompt.id) {
        errors.push(`重复标题: ${prompt.title}`)
      } else {
        titleMap.set(normalizedTitle, prompt.id)
      }
    }

    if (promptErrors.length) {
      errors.push(`[${prompt.id}] ${promptErrors.join(' / ')}`)
    }
    if (promptWarnings.length) {
      warnings.push(`[${prompt.id}] ${promptWarnings.join(' / ')}`)
    }
  })

  const sanitizedOutput = sanitizedPrompts.map(({ prompt }) => prompt)
  const nextIndex = {
    ...index,
    total: sanitizedOutput.length,
    lastUpdated: index.lastUpdated || Date.now(),
  }
  const nextTags = buildTags(sanitizedOutput)
  let existingFeatured = null
  try {
    existingFeatured = await readJson(featuredPath)
  } catch {
    existingFeatured = null
  }
  const manualFeaturedIds = readManualFeaturedIds(existingFeatured)
  const autoFeatured = buildFeatured(sanitizedOutput)
  const featuredMap = new Map(sanitizedOutput.map((prompt) => [prompt.id, prompt]))
  const manualFeaturedItems = manualFeaturedIds
    .map((id) => featuredMap.get(id))
    .filter(Boolean)
  const autoFeaturedItems = autoFeatured.filter((prompt) => !manualFeaturedIds.includes(prompt.id))
  const nextFeatured = {
    manualIds: manualFeaturedIds.filter((id) => featuredMap.has(id)).slice(0, 8),
    items: [...manualFeaturedItems, ...autoFeaturedItems].slice(0, 8),
    updatedAt: Date.now(),
  }

  if (shouldWrite) {
    for (const chunk of chunks) {
      const chunkPrompts = sanitizedOutput.filter((prompt) =>
        chunk.prompts.some((item) => item.id === prompt.id),
      )
      await writeJson(chunk.filePath, chunkPrompts)
    }

    nextIndex.lastUpdated = Date.now()
    await writeJson(indexPath, nextIndex)
    await writeJson(promptsPath, sanitizedOutput)
    await writeJson(featuredPath, nextFeatured)
    await writeJson(tagsPath, nextTags)
    console.log(`Wrote prompt metadata for ${sanitizedOutput.length} prompts.`)
  }

  if (shouldCheck && errors.length) {
    console.error('Content pipeline check failed:')
    errors.forEach((error) => console.error(`- ${error}`))
    process.exitCode = 1
    return
  }

  if (warnings.length) {
    console.warn('Content pipeline warnings:')
    warnings.forEach((warning) => console.warn(`- ${warning}`))
  }

  console.log(`Content pipeline check passed for ${sanitizedOutput.length} prompts.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
