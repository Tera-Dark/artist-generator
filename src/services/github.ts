import { Octokit } from '@octokit/rest'

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

        // Fetch issues with label 'submission' or just all open issues
        const { data } = await this.octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            state: 'open',
            labels: 'submission'
        })
        return data
    }

    // Admin: Approve (Merge to JSON + Close Issue)
    async approveSubmission(issueNumber: number, promptData: any) {
        if (!this.octokit) throw new Error('Admin not logged in')

        // 1. Get current prompts.json sha and content
        const path = 'public/data/prompts.json'
        let sha: string | undefined
        let content: any[] = []

        try {
            const { data } = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                path,
                ref: this.branch
            })

            if ('content' in data && 'sha' in data) {
                sha = data.sha
                const decoded = decodeURIComponent(escape(atob(data.content)))
                content = JSON.parse(decoded)
            }
        } catch (e) {
            // File likely doesn't exist yet, create it
            console.warn('prompts.json not found, creating new.', e)
        }

        // 2. Add new data
        // Ensure uniqueness
        if (!content.some((p: any) => p.id === promptData.id)) {
            content.unshift({ ...promptData, status: 'published', approved_at: Date.now() })
        }

        // 3. Commit update
        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message: `feat: approve submission #${issueNumber}`,
            content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
            sha, // Update needs SHA, create doesn't
            branch: this.branch
        })

        // 4. Close Issue
        await this.octokit.issues.update({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            state: 'closed',
            state_reason: 'completed',
            labels: ['approved']
        })
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
    async deletePrompt(id: string) {
        if (!this.octokit) throw new Error('Admin not logged in')
        const path = 'public/data/prompts.json'

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
        const path = 'public/data/prompts.json'

        const currentData = await this._fetchJson(path)
        const content = currentData.content.map((p: any) => p.id === prompt.id ? { ...p, ...prompt, updated_at: Date.now() } : p)

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
