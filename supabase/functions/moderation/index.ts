import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-mod-pwd, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function extractIP(req: Request): string | null {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('fly-client-ip') || null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Parse body first to determine action and whether moderator auth is required
  let body: any = null
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const action = body?.action

  // Moderator auth gate: required for moderation actions, not for public 'vote'
  if (action !== 'vote') {
    const pwd = req.headers.get('x-mod-pwd') || ''
    const expected = Deno.env.get('MODERATOR_PASSWORD') || 'admin123'
    if (!expected || pwd !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'missing_server_secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(url, serviceKey)

  try {
    if (action === 'listPending') {
      const { data, error } = await supabase
        .from('prompt_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify(data ?? []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'approve') {
      const id = String(body?.id ?? '')
      const reviewer = String(body?.reviewer ?? 'moderator')
      if (!id) throw new Error('missing id')

      const { data: row, error: fetchErr } = await supabase
        .from('prompt_submissions')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      if (!row) throw new Error('not found')

      const sp = {
        id: row.id,
        prompt: row.prompt,
        model: row.model,
        tags: row.tags ?? [],
        description: row.description ?? '',
        username: row.username ?? '',
        status: 'approved',
        created_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
      }
      const { error: insertErr } = await supabase.from('shared_prompts').insert(sp)
      if (insertErr) throw insertErr

      const { error: updateErr } = await supabase
        .from('prompt_submissions')
        .update({ status: 'approved', reviewed_by: reviewer, review_reason: null })
        .eq('id', id)
      if (updateErr) throw updateErr

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'reject') {
      const id = String(body?.id ?? '')
      const reviewer = String(body?.reviewer ?? 'moderator')
      const reason = String(body?.reason ?? '不符合社区规范')
      if (!id) throw new Error('missing id')

      const { error: updateErr } = await supabase
        .from('prompt_submissions')
        .update({ status: 'rejected', reviewed_by: reviewer, review_reason: reason })
        .eq('id', id)
      if (updateErr) throw updateErr

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'vote') {
      const id = String(body?.id ?? '')
      const vote = String(body?.vote ?? '')
      if (!id || !['up', 'down'].includes(vote)) {
        return new Response(JSON.stringify({ error: 'invalid_params' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const ip = extractIP(req)
      if (!ip) {
        return new Response(JSON.stringify({ error: 'ip_unavailable' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const salt = Deno.env.get('IP_HASH_SALT') || 'local-dev-salt'
      const ipHash = await sha256Hex(ip + ':' + salt)

      const { error: insErr } = await supabase.from('prompt_votes').insert({
        prompt_id: id,
        ip_hash: ipHash,
        vote,
        created_at: new Date().toISOString(),
      })
      if (insErr) {
        const msg = String(insErr.message || '')
        if (insErr.code === '23505' || msg.toLowerCase().includes('duplicate')) {
          return new Response(JSON.stringify({ error: 'already_voted' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: 'insert_failed', detail: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: curRow, error: selErr } = await supabase
        .from('shared_prompts')
        .select('upvotes, downvotes')
        .eq('id', id)
        .limit(1)
        .maybeSingle()
      if (selErr) {
        return new Response(JSON.stringify({ error: 'fetch_failed', detail: selErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const nextUp = (curRow?.upvotes ?? 0) + (vote === 'up' ? 1 : 0)
      const nextDown = (curRow?.downvotes ?? 0) + (vote === 'down' ? 1 : 0)

      const { error: updErr } = await supabase
        .from('shared_prompts')
        .update({ upvotes: nextUp, downvotes: nextDown })
        .eq('id', id)
      if (updErr) {
        return new Response(JSON.stringify({ error: 'update_failed', detail: updErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, id, upvotes: nextUp, downvotes: nextDown }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
