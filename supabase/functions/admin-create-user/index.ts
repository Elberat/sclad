import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const roleValues = new Set(['viewer', 'cashier', 'warehouse_manager', 'super_admin'])

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
  const email = String(payload?.email ?? '').trim().toLowerCase()
  const password = String(payload?.password ?? '')
  const fullName = typeof payload?.full_name === 'string' && payload.full_name.trim() ? payload.full_name.trim() : null
  const role = String(payload?.role ?? '')

  if (!email || password.length < 6 || !roleValues.has(role)) {
    return json({ error: 'invalid_payload' }, 400)
  }

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !authData.user) {
    return json({ error: createError?.message ?? 'user_not_created' }, 400)
  }

  const { data: profile, error: insertError } = await admin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
    })
    .select('*')
    .single()

  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return json({ error: insertError.message }, 400)
  }

  return json({ profile }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
