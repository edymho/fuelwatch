import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iamsfezpzdbrgofilism.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbXNmZXpwemRicmdvZmlsaXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDc4NDIsImV4cCI6MjA5MTgyMzg0Mn0.F54VPWybWg1WJh95O8FDwkzhr0BFsHovhcfemg8Oa-8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})

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
  async logout() { await supabase.auth.signOut() },
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  onAuthChange(cb) { return supabase.auth.onAuthStateChange(cb) }
}

export const profilesAPI = {
  async get(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  }
}

export const stationsAPI = {
  async getByCity(cidade) {
    const { data, error } = await supabase
      .from('stations')
      .select('*, fuel_availability(tipo,disponivel,nivel_pct,fila,fila_qtd,status,updated_at)')
      .eq('cidade', cidade).eq('ativa', true).order('nome')
    if (error) throw error
    return data
  },
  subscribeCity(cidade, cb) {
    return supabase.channel(`fuel:${cidade}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_availability' }, cb)
      .subscribe()
  }
}

export const fuelAPI = {
  async updateAll(stationId, fuelsObj, fila, filaQtd) {
    const user = await authAPI.getUser()
    const rows = Object.entries(fuelsObj).map(([tipo, disponivel]) => ({
      station_id: stationId, tipo, disponivel,
      status: disponivel ? 'disponivel' : 'sem stock',
      fila: fila || 'nenhuma', fila_qtd: filaQtd || 0,
      updated_by: user?.id, updated_at: new Date().toISOString()
    }))
    const { data, error } = await supabase
      .from('fuel_availability').upsert(rows, { onConflict: 'station_id,tipo' }).select()
    if (error) throw error
    return data
  }
}

export const reportsAPI = {
  async create({ stationId, tipoFuel, fila, filaQtd, nota }) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data, error } = await supabase.from('reports')
      .insert({ station_id: stationId, user_id: user.id, tipo_fuel: tipoFuel, fila, fila_qtd: filaQtd || 0, nota })
      .select('*, profiles(nome,tipo)').single()
    if (error) throw error
    await supabase.rpc('add_user_points', { uid: user.id, pts: 5 }).catch(() => {})
    return data
  }
}

export const messagesAPI = {
  async getAll(limit = 60) {
    const { data, error } = await supabase.from('messages')
      .select('*, profiles(nome,tipo)')
      .order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data.reverse()
  },
  async send({ conteudo, stationId }) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data, error } = await supabase.from('messages')
      .insert({ user_id: user.id, conteudo, station_id: stationId || null })
      .select('*, profiles(nome,tipo)').single()
    if (error) throw error
    return data
  },
  async vote(messageId, voto) {
    const user = await authAPI.getUser()
    if (!user) throw new Error('Precisas de estar autenticado')
    const { data: existing } = await supabase.from('message_votes')
      .select('id,voto').eq('message_id', messageId).eq('user_id', user.id).maybeSingle()
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

export const pricesAPI = {
  async getLatest() {
    const { data, error } = await supabase.from('fuel_prices')
      .select('*').order('vigente_de', { ascending: false }).limit(5)
    if (error) throw error
    return data
  }
}
