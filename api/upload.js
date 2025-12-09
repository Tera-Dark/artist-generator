export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const catboxUrl = 'https://catbox.moe/user/api.php';

    // Forward the request to Catbox
    const response = await fetch(catboxUrl, {
      method: 'POST',
      headers: {
        // Forward critical headers
        'Content-Type': req.headers.get('Content-Type'),
        'User-Agent': 'ArtistGenerator/1.0',
      },
      body: req.body,
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
