import { Octokit } from '@octokit/rest'
import { dataStorage } from '@/services/dataStorage'

export class GitHubService {
    private octokit: Octokit | null = null
    private owner: string
    private repo: string
    private branch: string

    constructor() {
        // Defaults or from Env
        this.owner = import.meta.env.VITE_REPO_OWNER || ''
        this.repo = import.meta.env.VITE_REPO_NAME || ''
        this.branch = 'main'
    }

    // Admin Init
    init(token: string, owner?: string, repo?: string) {
        this.octokit = new Octokit({ auth: token })
        if (owner) this.owner = owner
        if (repo) this.repo = repo
    }

    isReady() {
        return !!this.octokit
    }

    // Get Authenticated User
    async getUser() {
        if (!this.octokit) throw new Error('Not logged in')
        const { data } = await this.octokit.users.getAuthenticated()
        return data
    }

    // User: Get My Submissions (Issues created by me)
    async getUserSubmissions() {
        if (!this.octokit) throw new Error('Not logged in')

        // Need to know current username
        const user = await this.getUser()
        const username = user.login

        const { data } = await this.octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            creator: username,
            state: 'all', // Open and Closed
            per_page: 100
        })
        return data
    }

    // Admin: Get Pending Submissions (Issues)
    async getPendingIssues() {
        if (!this.octokit) throw new Error('Admin not logged in')

        // Fetch all open issues to catch submissions without labels (from non-collaborators)
        const { data } = await this.octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            state: 'open',
            per_page: 100
        })
        return data
    }

    // Admin: Approve (Merge to Chunked Storage + Close Issue)
    async approveSubmission(issueNumber: number, promptData: any) {
        if (!this.octokit) throw new Error('Admin not logged in')

        // Constants
        const { CHUNK_SIZE, INDEX_PATH, BASE_PATH } = dataStorage.config

        // Retry logic for optimistic locking (409 Conflict)
        const MAX_RETRIES = 3
        let attempt = 0

        while (attempt < MAX_RETRIES) {
            try {
                // 1. Fetch Index
                let indexData: any = { chunks: [], total: 0 }
                let indexSha: string | undefined

                try {
                    const indexRes = await this._fetchJson(INDEX_PATH)
                    indexData = indexRes.content
                    indexSha = indexRes.sha
                } catch (e) {
                    console.log('Index not found, initializing...')
                }

                // 2. Determine Target Chunk
                let targetChunkPath = ''
                let isNewChunk = false
                let chunkContent: any[] = []
                let chunkSha: string | undefined

                if (indexData.chunks.length === 0) {
                    // First ever chunk
                    targetChunkPath = `${BASE_PATH}/chunk_0.json`
                    isNewChunk = true
                } else {
                    const lastChunkName = indexData.chunks[indexData.chunks.length - 1]
                    targetChunkPath = `${BASE_PATH}/${lastChunkName}`

                    try {
                        const chunkRes = await this._fetchJson(targetChunkPath)
                        chunkContent = chunkRes.content
                        chunkSha = chunkRes.sha

                        if (chunkContent.length >= CHUNK_SIZE) {
                            // Last chunk full, create new
                            const nextIndex = indexData.chunks.length
                            targetChunkPath = `${BASE_PATH}/chunk_${nextIndex}.json`
                            isNewChunk = true
                            chunkContent = [] // Reset for new file
                            chunkSha = undefined
                        }
                    } catch (e) {
                        // Should not happen if index exists, but fallback
                        isNewChunk = true
                        chunkContent = []
                    }
                }

                // 3. Add Data to Chunk
                // Ensure uniqueness in this chunk
                if (!chunkContent.some((p: any) => p.id === promptData.id)) {
                    chunkContent.unshift({ ...promptData, status: 'published', approved_at: Date.now() })
                }

                // 4. Commit Chunk
                await this.octokit.repos.createOrUpdateFileContents({
                    owner: this.owner,
                    repo: this.repo,
                    path: targetChunkPath,
                    message: `feat: approve submission #${issueNumber} to ${targetChunkPath.split('/').pop()}`,
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(chunkContent, null, 2)))),
                    sha: chunkSha,
                    branch: this.branch
                })

                // 5. Update Index
                indexData.total = (indexData.total || 0) + 1
                indexData.lastUpdated = Date.now()

                if (isNewChunk) {
                    const chunkName = targetChunkPath.split('/').pop()
                    if (chunkName) {
                        indexData.chunks.push(chunkName)
                    }
                }

                await this.octokit.repos.createOrUpdateFileContents({
                    owner: this.owner,
                    repo: this.repo,
                    path: INDEX_PATH,
                    message: `chore: update index (total: ${indexData.total})`,
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(indexData, null, 2)))),
                    sha: indexSha,
                    branch: this.branch
                })

                // Success! Break loop
                break
            } catch (e: any) {
                if (e.status === 409 && attempt < MAX_RETRIES - 1) {
                    console.warn(`Conflict detected (attempt ${attempt + 1}), retrying...`)
                    attempt++
                    await new Promise(r => setTimeout(r, 1000 * Math.random() + 500)) // Jitter
                    continue
                }
                throw e // Rethrow if not 409 or max retries reached
            }
        }

        // 6. Close Issue (This can fail safely, data is already saved)
        try {
            await this.octokit.issues.update({
                owner: this.owner,
                repo: this.repo,
                issue_number: issueNumber,
                state: 'closed',
                state_reason: 'completed',
                labels: ['approved']
            })
        } catch (e) {
            console.error('Failed to close issue after approval', e)
        }
    }

    // Admin: Reject (Close Issue)
    async rejectSubmission(issueNumber: number, reason: string) {
        if (!this.octokit) throw new Error('Admin not logged in')

        await this.octokit.issues.createComment({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            body: `Submission rejected: ${reason}`
        })

        await this.octokit.issues.update({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            state: 'closed',
            state_reason: 'not_planned',
            labels: ['rejected']
        })
    }

    // Admin: Get Rejected Submissions
    async getRejectedIssues() {
        if (!this.octokit) throw new Error('Admin not logged in')

        const { data } = await this.octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            state: 'closed',
            labels: 'rejected'
        })
        return data
    }

    // Admin: Get Draft Submissions
    async getDraftIssues() {
        if (!this.octokit) throw new Error('Admin not logged in')

        const { data } = await this.octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            state: 'open',
            labels: 'draft'
        })
        return data
    }

    // Admin: Update Issue (Save Draft/Edit without Publishing)
    async updateIssue(issueNumber: number, data: any, labels?: string[]) {
        if (!this.octokit) throw new Error('Admin not logged in')

        const title = `[Submission] ${data.title}`
        const body = `
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

**Description:**
${data.description}

*Updated by Moderator*
`.trim()

        const updateParams: any = {
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            title,
            body
        }

        if (labels) {
            updateParams.labels = labels
        }

        await this.octokit.issues.update(updateParams)
    }

    // Public: Generate Issue Link
    getSubmissionLink(data: any) {
        // If image is local blob/data, clear it so user knows to provide a real link
        if (data.image && (data.image.startsWith('blob:') || data.image.startsWith('data:'))) {
            data.image = ''
        }

        const title = `[Submission] ${data.title}`
        const body = `
## Image
p.s. Drag and drop your generated image here!
*(The URL will appear below automatically, please copy it into the "image": "" field below if you want stricter control, but we will try to find it)*

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

**Description:**
${data.description}

*Submitted via Artist Generator*
    `.trim()

        return `https://github.com/${this.owner}/${this.repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=submission`
    }
    // Public: Create Submission Issue (In-App)
    async submitIssue(data: any) {
        if (!this.octokit) throw new Error('Not logged in')

        // If image is local blob/data, clear it so user knows to provide a real link
        if (data.image && (data.image.startsWith('blob:') || data.image.startsWith('data:'))) {
            data.image = ''
        }

        const title = `[Submission] ${data.title}`
        const body = `
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

**Description:**
${data.description}

*Submitted via Artist Generator*
    `.trim()

        const { data: issue } = await this.octokit.issues.create({
            owner: this.owner,
            repo: this.repo,
            title,
            body,
            labels: ['submission']
        })

        return issue
    }

    // User: Delete Submission (Close Issue)
    async deleteIssue(issueNumber: number) {
        if (!this.octokit) throw new Error('Not logged in')

        // Just close the issue
        await this.octokit.issues.update({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            state: 'closed',
            state_reason: 'completed'
        })
    }

    // Admin: Check Permissions
    async checkPermissions() {
        if (!this.octokit) return false
        try {
            const { data } = await this.octokit.repos.get({
                owner: this.owner,
                repo: this.repo
            })
            return data.permissions?.push || false // Check for push access
        } catch (e) {
            return false
        }
    }

    // Admin: Upload Image
    async uploadImage(file: File): Promise<string> {
        if (!this.octokit) throw new Error('Admin not logged in')

        const timestamp = Date.now()
        const ext = file.name.split('.').pop() || 'png'
        const path = `public/images/${timestamp}.${ext}`

        const content = await this._fileToBase64(file)

        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message: `upload: image ${file.name}`,
            content: content.split(',')[1], // Remove data prefix
            branch: this.branch
        })

        // Return raw URL or relative path
        // Using jsdelivr or raw.githubusercontent is common for avoiding relative path issues in some envs
        // But relative 'images/...' works if base is correct.
        // Let's return the public absolute URL for safety across deployments.
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${path}`
    }

    private _fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    }

    // Admin: Delete Prompt
    async deletePrompt(id: string, chunkPath?: string) {
        if (!this.octokit) throw new Error('Admin not logged in')
        const path = chunkPath || 'public/data/prompts.json'

        // Fetch current
        const currentData = await this._fetchJson(path)
        const content = currentData.content.filter((p: any) => p.id !== id)

        // Commit
        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message: `chore: delete prompt ${id}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
            sha: currentData.sha,
            branch: this.branch
        })
    }

    // Admin: Update Prompt (Edit)
    async updatePrompt(prompt: any) {
        if (!this.octokit) throw new Error('Admin not logged in')
        const path = prompt._chunkPath || 'public/data/prompts.json'

        // Clean internal props
        const { _chunkPath, ...cleanPrompt } = prompt

        const currentData = await this._fetchJson(path)
        const content = currentData.content.map((p: any) => p.id === cleanPrompt.id ? { ...p, ...cleanPrompt, updated_at: Date.now() } : p)

        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message: `feat: update prompt ${prompt.title}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
            sha: currentData.sha,
            branch: this.branch
        })
    }

    // Helper: Fetch JSON with SHA
    private async _fetchJson(path: string) {
        if (!this.octokit) throw new Error('Admin not logged in')
        const { data } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path,
            ref: this.branch
        })

        if ('content' in data && 'sha' in data) {
            const decoded = decodeURIComponent(escape(atob(data.content)))
            return {
                sha: data.sha,
                content: JSON.parse(decoded)
            }
        }
        throw new Error('File not found')
    }
}

export const githubService = new GitHubService()
