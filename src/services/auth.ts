
const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ''
const GATEKEEPER_URL = import.meta.env.VITE_GATEKEEPER_URL || '' // e.g., https://my-gatekeeper.herokuapp.com/authenticate/
const REDIRECT_URI = window.location.origin + '/moderation'
const AUTH_URL = `https://github.com/login/oauth/authorize`
const TOKEN_KEY = 'ag_gh_token'

export const authService = {
  login() {
    if (!CLIENT_ID) {
      console.error('Missing VITE_GITHUB_CLIENT_ID')
      alert('GitHub Client ID is not configured.')
      return
    }
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'repo',
      allow_signup: 'true'
    })
    window.location.href = `${AUTH_URL}?${params.toString()}`
  },

  async handleCallback(code: string): Promise<string | null> {
    if (!GATEKEEPER_URL) {
      console.error('Missing VITE_GATEKEEPER_URL')
      // Fallback: If no gatekeeper, we can't exchange safely client-side without exposing secret.
      // But maybe the user has a different mechanism?
      // For now, return null and let the UI show an error.
      return null
    }

    try {
      const res = await fetch(`${GATEKEEPER_URL}${code}`)
      const data = await res.json()
      if (data.token) {
        this.setToken(data.token)
        return data.token
      }
      return null
    } catch (e) {
      console.error('Token exchange failed', e)
      return null
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}
