export default async function handler(request, response) {
  // 1. 获取前端传来的 code
  const { code } = request.query;

  // 2. 获取环境变量中的密钥 (这些配置在 Vercel 后台，不会暴露给前端)
  const client_id = process.env.VITE_GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return response.status(400).json({ error: 'Missing code parameter' });
  }

  if (!client_id || !client_secret) {
    return response.status(500).json({ error: 'Server misconfiguration: Missing Client ID or Secret' });
  }

  try {
    // 3. 向 GitHub 交换 Token
    const result = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });

    const data = await result.json();

    // 4. 处理错误
    if (data.error) {
      return response.status(401).json({ error: data.error_description });
    }

    // 5. 返回 Token 给前端 (格式需匹配 auth.ts 的期望: { token: "..." })
    return response.status(200).json({ token: data.access_token });

  } catch (error) {
    console.error('Auth Error:', error);
    return response.status(500).json({ error: 'Internal Server Error during GitHub exchange' });
  }
}
