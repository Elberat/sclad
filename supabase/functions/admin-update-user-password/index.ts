import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'server_not_configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return json({ error: 'not_authenticated' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user: currentUser },
    error: userError,
  } = await admin.auth.getUser(token)

  if (userError || !currentUser) {
    return json({ error: 'not_authenticated' }, 401)
  }

  const { data: currentProfile, error: profileError } = await admin
    .from('profiles')
    .select('role,is_active')
    .eq('id', currentUser.id)
    .single()

  if (profileError || !currentProfile?.is_active || currentProfile.role !== 'super_admin') {
    return json({ error: 'forbidden' }, 403)
  }

  const payload = await req.json().catch(() => null)
  const id = String(payload?.id ?? '')
  const password = String(payload?.password ?? '')

  if (!id || password.length < 6) {
    return json({ error: 'invalid_payload' }, 400)
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) {
    return json({ error: error.message }, 400)
  }

  return json({ success: true }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
