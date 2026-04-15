// ═══════════════════════════════════════════════════════
// FUELWATCH — Cliente Supabase (src/supabase.js)
// ═══════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 10 } } }
)

// ─── AUTH ──────────────────────────────────────────────
export const authAPI = {
  async register({ nome, email, password, telefone, tipo, bomba }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome, tipo, telefone, bomba } }
    })
    if (error) throw error
    return data
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    await supabase.auth.signOut()
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthChange(cb) {
    return supabase.auth.onAuthStateChange(cb)
  }
}

// ─── PROFILES ──────────────────────────────────────────
export const profilesAPI = {
  async get(userId) {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  },
  async update(userId, updates) {
    const { data, error } = await supabase
      .from('profiles').update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId).select().single()
    if (error) throw error
    return data
  }
}

// ─── STATIONS ──────────────────────────────────────────
export const stationsAPI = {
  async getByCity(cidade) {
    const { data, error } = await supabase
      .from('stations')
      .select(`*, fuel_availability(tipo,disponivel,nivel_pct,fila,fila_qtd,status,updated_at)`)
      .eq('cidade', cidade).eq('ativa', true).order('nome')
    if (error) throw error
    return data
  },

  async get(id) {
    const { data, error } = await supabase
      .from('stations')
      .select(`*, fuel_availability(*), reports(*, profiles(nome,tipo))`)
      .eq('id', id).single()
    if (error) throw error
    return data
  },

  subscribeCity(cidade, cb) {
    return supabase.channel(`fuel:${cidade}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_availability' }, cb)
      .subscribe()
  }
}

// ─── FUEL AVAILABILITY ─────────────────────────────────
export const fuelAPI = {
  async updateAll(stationId, fuelsObj, fila, filaQtd) {
    const user = await authAPI.getUser()
    const rows = Object.entries(fuelsObj).map(([tipo, disponivel]) => ({
      station_id: stationId, tipo, disponivel,
      status: disponivel ? 'disponível' : 'sem stock',
      fila: fila || 'nenhuma', fila_qtd: filaQtd || 0,
      updated_by: user?.id, updated_at: new Date().toISOString()
    }))
    const { data, error } = await supabase
      .from('fuel_availability').upsert(rows, { onConflict: 'station_id,tipo' }).select()
    if (error) throw error
    return data
  }
}

// ─── REPORTS ───────────────────────────────────────────
export const reportsAPI = {
  async create({ stationId, tipoFuel, fila, filaQtd, nota }) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data, error } = await supabase
      .from('reports')
      .insert({ station_id: stationId, user_id: user.id, tipo_fuel: tipoFuel, fila, fila_qtd: filaQtd || 0, nota })
      .select('*, profiles(nome,tipo)').single()
    if (error) throw error
    await supabase.rpc('add_user_points', { uid: user.id, pts: 5 })
    return data
  },

  async getByStation(stationId, limit = 20) {
    const { data, error } = await supabase
      .from('reports').select('*, profiles(nome,tipo)')
      .eq('station_id', stationId).order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data
  },

  async vote(reportId, voto) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data: existing } = await supabase
      .from('report_votes').select('id,voto').eq('report_id', reportId).eq('user_id', user.id).maybeSingle()
    if (existing?.voto === voto) {
      await supabase.from('report_votes').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('report_votes').update({ voto }).eq('id', existing.id)
    } else {
      await supabase.from('report_votes').insert({ report_id: reportId, user_id: user.id, voto })
    }
  }
}

// ─── MESSAGES ──────────────────────────────────────────
export const messagesAPI = {
  async getAll(limit = 60) {
    const { data, error } = await supabase
      .from('messages').select('*, profiles(nome,tipo)')
      .order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data.reverse()
  },

  async send({ conteudo, stationId, imagemUrl }) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: user.id, conteudo, station_id: stationId || null, imagem_url: imagemUrl || null })
      .select('*, profiles(nome,tipo)').single()
    if (error) throw error
    return data
  },

  async vote(messageId, voto) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data: existing } = await supabase
      .from('message_votes').select('id,voto').eq('message_id', messageId).eq('user_id', user.id).maybeSingle()
    if (existing?.voto === voto) {
      await supabase.from('message_votes').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('message_votes').update({ voto }).eq('id', existing.id)
    } else {
      await supabase.from('message_votes').insert({ message_id: messageId, user_id: user.id, voto })
    }
  },

  subscribe(cb) {
    return supabase.channel('messages:live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, cb)
      .subscribe()
  }
}

// ─── PRICES ────────────────────────────────────────────
export const pricesAPI = {
  async getLatest() {
    const { data, error } = await supabase
      .from('fuel_prices').select('*').order('vigente_de', { ascending: false }).limit(5)
    if (error) throw error
    return data
  }
}
