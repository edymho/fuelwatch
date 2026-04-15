import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin, Fuel, MessageSquare, User, TrendingUp, Newspaper,
  LogOut, Bell, Search, ChevronRight, Check, X, AlertTriangle,
  Clock, Phone, RefreshCw, Send, ThumbsUp, ThumbsDown, BarChart2,
  Activity, Users, CheckCircle, Lock, Zap, Shield,
  Navigation, Radio
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { supabase, authAPI, stationsAPI, fuelAPI, reportsAPI, messagesAPI, pricesAPI } from "./supabase.js";

// ─── DESIGN TOKENS ────────────────────────────────────
const T = {
  amber:"#e8930a", amberLt:"#fff7e6", amberBd:"#fcd34d",
  green:"#16a34a", greenLt:"#f0fdf4",
  red:"#dc2626",   redLt:"#fef2f2",
  blue:"#2563eb",  purple:"#7c3aed", teal:"#0891b2", pink:"#db2777",
  gray1:"#f8f7f4", gray2:"#f0ede8", gray3:"#e2ddd6",
  gray4:"#9a9085", gray5:"#4a453f", dark:"#1a1714",
};

const FUEL_TYPES = [
  { key:"g87",    label:"Gasolina 87",     color:T.amber   },
  { key:"g95",    label:"Gasolina 95",     color:"#f97316" },
  { key:"diesel", label:"Diesel",          color:T.blue    },
  { key:"petro",  label:"Petróleo",        color:T.purple  },
  { key:"gpl",    label:"Gás GPL 12,5kg",  color:T.green   },
];
const FLAB = { g87:"G87", g95:"G95", diesel:"Diesel", petro:"Petróleo", gpl:"GPL" };
const CITIES = ["Maputo","Matola","Beira","Nampula","Pemba","Quelimane","Tete","Inhambane"];
const QUEUE_COLOR = { baixa:T.green, média:T.amber, alta:T.red, nenhuma:T.gray4 };

const card  = (e={}) => ({ background:"white", borderRadius:16, border:`1px solid ${T.gray3}`, ...e });
const pill  = (bg,c,e={}) => ({ background:bg, color:c, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4, ...e });

// ─── HELPER: converter dados do Supabase para formato app ──
function parseStation(s) {
  const avail = {};
  const fa = s.fuel_availability || [];
  FUEL_TYPES.forEach(f => {
    const row = fa.find(r => r.tipo === f.key);
    avail[f.key] = row?.disponivel || false;
  });
  const anyAvail = fa.some(r => r.disponivel);
  const anyMissing = fa.some(r => !r.disponivel);
  const status = !anyAvail ? "sem stock" : anyMissing ? "parcial" : "disponível";
  const latestFila = fa.find(r => r.fila && r.fila !== "nenhuma");
  const fila = latestFila?.fila || "nenhuma";
  const qn = latestFila?.fila_qtd || 0;
  const updatedAt = fa.reduce((acc, r) => r.updated_at > acc ? r.updated_at : acc, "");
  const minutesAgo = updatedAt ? Math.round((Date.now() - new Date(updatedAt)) / 60000) : null;
  const upd = minutesAgo === null ? "nunca" : minutesAgo < 60 ? `${minutesAgo} min` : `${Math.round(minutesAgo/60)}h`;
  return { ...s, fuels: avail, status, fila, qn, upd, rating: s.rating || 4.0 };
}

// ─── ATOMS ────────────────────────────────────────────
function Dot({color,size=7}){ return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:color,flexShrink:0}}/>; }
function StatusPill({status}){
  const m={disponível:{bg:T.greenLt,c:T.green,dot:"#22c55e"},parcial:{bg:T.amberLt,c:"#b45309",dot:T.amber},"sem stock":{bg:T.redLt,c:T.red,dot:T.red}}[status]||{};
  return <span style={pill(m.bg,m.c)}><Dot color={m.dot} size={5}/>{status}</span>;
}
function Av({ini,color,size=34}){
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",color,fontWeight:600,fontSize:Math.round(size*.33),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ini}</div>;
}
function Spinner(){ return <div style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${T.amberLt}`,borderTopColor:T.amber,animation:"spin .7s linear infinite",margin:"32px auto"}}/>; }
function Toast({msg}){ return <div style={{position:"fixed",top:68,left:"50%",transform:"translateX(-50%)",background:T.dark,color:"white",padding:"10px 18px",borderRadius:24,fontSize:13,fontWeight:500,zIndex:400,whiteSpace:"nowrap"}}>{msg}</div>; }

// ─── AUTH MODAL ───────────────────────────────────────
function AuthModal({onClose,onSuccess,reason}){
  const [mode,setMode]=useState("login");
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({nome:"",email:"",tel:"",tipo:"cliente",bomba:"",pwd:""});

  const doLogin=async(e)=>{
    e.preventDefault(); setLoading(true); setErr(null);
    try {
      const data = await authAPI.login({email:form.email, password:form.pwd});
      const profile = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*`,
        {headers:{"apikey":import.meta.env.VITE_SUPABASE_ANON_KEY,"Authorization":`Bearer ${data.session.access_token}`}})
        .then(r=>r.json()).then(d=>d[0]);
      onSuccess({...profile, email:data.user.email});
    } catch(e){ setErr(e.message); }
    setLoading(false);
  };

  const doRegister=async(e)=>{
    e.preventDefault(); setLoading(true); setErr(null);
    if(form.pwd.length<6){setErr("Senha deve ter pelo menos 6 caracteres.");setLoading(false);return;}
    try {
      await authAPI.register({nome:form.nome,email:form.email,password:form.pwd,telefone:form.tel,tipo:form.tipo,bomba:form.bomba});
      setErr(null);
      setMode("login");
      setErr("✅ Conta criada! Verifica o email e faz login.");
    } catch(e){ setErr(e.message); }
    setLoading(false);
  };

  const inp=(p={})=>({style:{width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${T.gray3}`,fontSize:13,boxSizing:"border-box",background:"white",color:T.dark,outline:"none"},...p});

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
        <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 20px"}}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:16,background:T.amberLt,margin:"0 auto 10px",display:"flex",alignItems:"center",justifyContent:"center"}}><Lock size={20} color={T.amber}/></div>
          <div style={{fontWeight:600,fontSize:17,color:T.dark,marginBottom:4}}>FuelWatch — Acesso</div>
          <div style={{fontSize:13,color:T.gray4}}>{reason||"Entra para participar na comunidade"}</div>
        </div>
        <div style={{display:"flex",background:T.gray2,borderRadius:12,padding:3,marginBottom:18}}>
          {[["login","Entrar"],["reg","Criar conta"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr(null);}} style={{flex:1,padding:"9px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:mode===m?600:400,background:mode===m?"white":T.gray2,color:mode===m?T.dark:T.gray4}}>{l}</button>
          ))}
        </div>
        {err&&<div style={{background:err.startsWith("✅")?T.greenLt:T.redLt,color:err.startsWith("✅")?T.green:T.red,fontSize:12,padding:"8px 12px",borderRadius:8,marginBottom:12}}>{err}</div>}
        {mode==="login"?(
          <form onSubmit={doLogin} style={{display:"grid",gap:10}}>
            <input {...inp()} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
            <input {...inp()} type="password" value={form.pwd} onChange={e=>setForm({...form,pwd:e.target.value})} placeholder="Senha"/>
            <button type="submit" disabled={loading} style={{padding:"12px",borderRadius:12,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:600,cursor:"pointer"}}>{loading?"A entrar...":"Entrar"}</button>
          </form>
        ):(
          <form onSubmit={doRegister} style={{display:"grid",gap:10}}>
            <input {...inp()} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome completo"/>
            <input {...inp()} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
            <input {...inp()} value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="Telefone"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              {[["cliente","👤","Cliente"],["funcionário","⚙️","Func."],["proprietário","🏪","Prop."]].map(([v,ic,l])=>(
                <button type="button" key={v} onClick={()=>setForm({...form,tipo:v})} style={{padding:"9px 4px",borderRadius:10,border:`1.5px solid ${form.tipo===v?T.amber:T.gray3}`,background:form.tipo===v?T.amberLt:"white",color:form.tipo===v?"#92400e":T.gray4,fontSize:11,cursor:"pointer",fontWeight:form.tipo===v?600:400}}>{ic} {l}</button>
              ))}
            </div>
            {form.tipo!=="cliente"&&<input {...inp()} value={form.bomba} onChange={e=>setForm({...form,bomba:e.target.value})} placeholder="Nome da bomba"/>}
            <input {...inp()} type="password" value={form.pwd} onChange={e=>setForm({...form,pwd:e.target.value})} placeholder="Senha (mín. 6 caracteres)"/>
            <button type="submit" disabled={loading} style={{padding:"12px",borderRadius:12,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:600,cursor:"pointer"}}>{loading?"A criar...":"Criar conta"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── REPORT MODAL ─────────────────────────────────────
function ReportModal({s,onClose,onDone}){
  const [fuel,setFuel]=useState(null);
  const [queue,setQueue]=useState("média");
  const [note,setNote]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!fuel)return;
    setLoading(true);
    try{
      await onDone({stationId:s.id, tipoFuel:fuel, fila:queue, filaQtd:0, nota:note});
      onClose();
    }catch(e){ alert(e.message); }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
        <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 14px"}}/>
        <div style={{fontWeight:700,fontSize:16,color:T.dark,marginBottom:4}}>Confirmar abastecimento</div>
        <div style={{fontSize:12,color:T.gray4,marginBottom:16}}>{s.nome}</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:8}}>Que combustível abasteceste?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {FUEL_TYPES.map(f=>(
              <button key={f.key} onClick={()=>setFuel(f.key)} style={{padding:"11px",borderRadius:10,border:`1.5px solid ${fuel===f.key?f.color:T.gray3}`,background:fuel===f.key?f.color+"18":"white",color:fuel===f.key?f.color:T.gray5,fontSize:12,cursor:"pointer",fontWeight:fuel===f.key?600:400,textAlign:"left"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:f.color,marginBottom:4}}/>{f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:8}}>Tamanho da fila</div>
          <div style={{display:"flex",gap:7}}>
            {[["baixa",T.green],["média",T.amber],["alta",T.red]].map(([q,c])=>(
              <button key={q} onClick={()=>setQueue(q)} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${queue===q?c:T.gray3}`,background:queue===q?c+"18":"white",color:queue===q?c:T.gray4,fontSize:12,cursor:"pointer",fontWeight:queue===q?600:400}}>{q}</button>
            ))}
          </div>
        </div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota adicional (opcional)" rows={2} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.gray3}`,fontSize:13,resize:"none",boxSizing:"border-box",outline:"none"}}/>
        <button onClick={submit} disabled={!fuel||loading} style={{marginTop:12,width:"100%",padding:"13px",borderRadius:13,border:"none",background:fuel?T.amber:T.gray2,color:fuel?"white":T.gray4,fontSize:14,fontWeight:700,cursor:fuel?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <CheckCircle size={15}/> {loading?"A confirmar...":"Confirmar e partilhar"}
        </button>
      </div>
    </div>
  );
}

// ─── MAP TAB ──────────────────────────────────────────
function MapTab({stations,onSelectStation}){
  const sdot={disponível:"#22c55e",parcial:T.amber,"sem stock":T.red};
  const W=400,H=260;
  return(
    <div>
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.gray3}`,marginBottom:14,position:"relative"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{display:"block",width:"100%",height:"auto",background:"#e8f4f8"}}>
          <path d="M318 0 L400 0 L400 260 L330 260 L295 215 L298 175 L316 135 L325 95 L318 55 Z" fill="#bfdbfe" opacity=".75"/>
          <text x="340" y="131" fontSize="9" fill="#60a5fa" fontWeight="500" textAnchor="middle">Baía de Maputo</text>
          {[[0,108,W,108,1.5],[0,72,318,72,1],[0,150,298,150,1]].map(([x1,y1,x2,y2,sw],i)=>(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={sw}/>))}
          {[[96,0,96,260,1.5],[192,0,192,260,1]].map(([x1,y1,x2,y2,sw],i)=>(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={sw}/>))}
          {stations.map(s=>{
            const cx=(s.px/100)*W,cy=(s.py/100)*H,col=sdot[s.status]||T.amber;
            return(<g key={s.id} style={{cursor:"pointer"}} onClick={()=>onSelectStation(s)}>
              <circle cx={cx} cy={cy} r={10} fill={col} stroke="white" strokeWidth={2.5}/>
              <text x={cx} y={cy+4} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">⛽</text>
            </g>);
          })}
        </svg>
        <div style={{position:"absolute",bottom:8,left:8,background:"rgba(255,255,255,.93)",borderRadius:10,padding:"7px 10px"}}>
          {[["disponível","#22c55e"],["parcial",T.amber],["sem stock",T.red]].map(([l,c])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,fontSize:10,color:T.dark}}><Dot color={c}/>{l}</div>))}
        </div>
      </div>
      <div style={{display:"grid",gap:8}}>
        {[...stations].sort((a,b)=>{const o={disponível:0,parcial:1,"sem stock":2};return o[a.status]-o[b.status];}).slice(0,4).map(s=>(
          <button key={s.id} onClick={()=>onSelectStation(s)} style={{...card(),padding:"12px 14px",cursor:"pointer",border:`1px solid ${T.gray3}`,background:"white",textAlign:"left",width:"100%",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:{disponível:T.greenLt,parcial:T.amberLt,"sem stock":T.redLt}[s.status],display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⛽</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:T.dark,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.nome}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><StatusPill status={s.status}/><span style={{fontSize:11,color:QUEUE_COLOR[s.fila],fontWeight:500}}>{s.qn>0?`${s.qn} viat.`:"livre"}</span></div>
            </div>
            <ChevronRight size={16} color={T.gray4}/>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── BOMBAS TAB ───────────────────────────────────────
function BombasTab({stations,onSelectStation}){
  const [q,setQ]=useState("");
  const [flt,setFlt]=useState("todos");
  const filtered=useMemo(()=>{
    let l=stations;
    if(q) l=l.filter(s=>s.nome.toLowerCase().includes(q.toLowerCase())||s.endereco?.toLowerCase().includes(q.toLowerCase()));
    if(flt!=="todos") l=l.filter(s=>s.status===flt);
    return [...l].sort((a,b)=>{const o={disponível:0,parcial:1,"sem stock":2};return o[a.status]-o[b.status];});
  },[stations,q,flt]);

  return(
    <div>
      <div style={{position:"relative",marginBottom:10}}>
        <Search size={15} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.gray4}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar bomba ou zona..." style={{width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,border:`1px solid ${T.gray3}`,fontSize:13,boxSizing:"border-box",outline:"none"}}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
        {[["todos","Todas"],["disponível","Com stock"],["parcial","Parcial"],["sem stock","Sem stock"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFlt(v)} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${flt===v?T.amber:T.gray3}`,background:flt===v?T.amberLt:"white",color:flt===v?"#92400e":T.gray5,fontSize:12,cursor:"pointer",fontWeight:flt===v?600:400}}>{l}</button>
        ))}
      </div>
      <div style={{fontSize:12,color:T.gray4,marginBottom:10}}>{filtered.length} bombas</div>
      <div style={{display:"grid",gap:8}}>
        {filtered.map(s=>(
          <button key={s.id} onClick={()=>onSelectStation(s)} style={{...card(),padding:"14px 16px",cursor:"pointer",textAlign:"left",width:"100%",border:`1px solid ${T.gray3}`,background:"white"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div style={{flex:1,paddingRight:8}}>
                <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:2}}>{s.nome}{s.verificada&&<span style={{marginLeft:6,fontSize:10,color:T.blue}}>✓</span>}</div>
                <div style={{fontSize:11,color:T.gray4}}>{s.endereco}</div>
              </div>
              <StatusPill status={s.status}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:QUEUE_COLOR[s.fila],fontWeight:500,display:"flex",alignItems:"center",gap:4}}><Users size={12}/>{s.qn>0?`${s.qn} viat. · fila ${s.fila}`:"sem fila"}</span>
              <span style={{fontSize:10,color:T.gray4,display:"flex",alignItems:"center",gap:3}}><Clock size={10}/>há {s.upd}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PREÇOS TAB ───────────────────────────────────────
function PrecosTab({prices}){
  return(
    <div>
      <div style={{background:"#fff7e6",border:`1px solid ${T.amberBd}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:12,color:"#92400e",display:"flex",gap:8,alignItems:"flex-start"}}>
        <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
        Tabela oficial ARENE/MIREME. Actualizada mensalmente.
      </div>
      <div style={{...card(),overflow:"hidden"}}>
        <div style={{background:T.gray1,padding:"10px 16px",display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
          <span style={{fontSize:11,fontWeight:600,color:T.gray4}}>Combustível</span>
          <span style={{fontSize:11,fontWeight:600,color:T.gray4,textAlign:"right"}}>Preço oficial (MZN)</span>
        </div>
        {prices.map(f=>{
          const ft=FUEL_TYPES.find(x=>x.key===f.tipo);
          return(
            <div key={f.id} style={{padding:"13px 16px",borderTop:`1px solid ${T.gray2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:(ft?.color||T.amber)+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Dot color={ft?.color||T.amber} size={12}/></div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.dark}}>{f.label}</div>
                  <div style={{fontSize:10,color:T.gray4}}>{f.unidade}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:16,fontWeight:700,color:T.dark}}>{Number(f.preco).toFixed(2)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NOTÍCIAS TAB (IA) ────────────────────────────────
function NoticiasTab({city}){
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1400,messages:[{role:"user",
          content:`Cria 5 notícias jornalísticas realistas sobre a crise de combustível em Moçambique (${city}) em Abril 2025. JSON sem markdown:\n[{"titulo":"...","fonte":"...","resumo":"...","data":"...","categoria":"governo|abastecimento|preços|alerta","urgente":true|false}]`
        }]})});
      const d=await r.json();
      setNews(JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{load();},[city]);

  const CAT={governo:{bg:"#eff6ff",c:T.blue},abastecimento:{bg:T.greenLt,c:"#15803d"},preços:{bg:T.amberLt,c:"#92400e"},alerta:{bg:T.redLt,c:T.red}};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:12,color:T.gray4}}>Feed automático de fontes oficiais e media</div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,padding:"6px 12px",borderRadius:20,border:`1px solid ${T.gray3}`,background:"white",cursor:"pointer",color:T.gray5}}><RefreshCw size={11}/>Actualizar</button>
      </div>
      {loading&&<Spinner/>}
      {!loading&&news.map((n,i)=>{
        const c=CAT[n.categoria]||CAT.governo;
        return(
          <div key={i} style={{...card(),padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{display:"flex",gap:6}}><span style={pill(c.bg,c.c)}>{n.categoria}</span>{n.urgente&&<span style={pill(T.redLt,T.red)}><Zap size={9}/>urgente</span>}</div>
              <span style={{fontSize:11,color:T.gray4}}>{n.data}</span>
            </div>
            <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:5,lineHeight:1.4}}>{n.titulo}</div>
            <div style={{fontSize:12,color:T.gray5,lineHeight:1.65,marginBottom:7}}>{n.resumo}</div>
            <div style={{fontSize:11,color:T.gray4}}>Fonte: <span style={{color:T.blue}}>{n.fonte}</span></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CHAT TAB ─────────────────────────────────────────
function ChatTab({user,onNeedAuth,stations}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(true);
  const bottomRef=useRef(null);

  useEffect(()=>{
    messagesAPI.getAll().then(data=>{
      setMsgs(data);
      setLoading(false);
    });
    const sub=messagesAPI.subscribe(payload=>{
      if(payload.eventType==="INSERT"){
        // Fetch full message with profile
        supabase.from("messages").select("*, profiles(nome,tipo)").eq("id",payload.new.id).single()
          .then(({data})=>{ if(data) setMsgs(m=>[...m,data]); });
      }
    });
    return ()=>{ supabase.removeChannel(sub); };
  },[]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send=async()=>{
    if(!user){ onNeedAuth("Para participar no chat precisas de uma conta."); return; }
    if(!input.trim()) return;
    const txt=input; setInput("");
    try{ await messagesAPI.send({conteudo:txt}); }
    catch(e){ setInput(txt); alert(e.message); }
  };

  const vote=async(msgId,voto)=>{
    if(!user){ onNeedAuth("Precisas de uma conta para votar."); return; }
    try{
      await messagesAPI.vote(msgId,voto);
      setMsgs(ms=>ms.map(m=>{
        if(m.id!==msgId)return m;
        const prev=m._voted;
        const upd={...m};
        if(prev===voto){upd.votos_up-=(voto==="up"?1:0);upd.votos_down-=(voto==="down"?1:0);upd._voted=null;}
        else{
          if(prev){upd.votos_up-=(prev==="up"?1:0);upd.votos_down-=(prev==="down"?1:0);}
          upd.votos_up+=(voto==="up"?1:0);upd.votos_down+=(voto==="down"?1:0);upd._voted=voto;
        }
        return upd;
      }));
    }catch(e){ console.error(e); }
  };

  const roleColor={proprietário:{bg:"#faf5ff",c:T.purple},funcionário:{bg:T.greenLt,c:"#059669"},cliente:{bg:"#eff6ff",c:T.blue}};

  return(
    <div>
      {loading?<Spinner/>:(
        <div style={{maxHeight:380,overflowY:"auto",marginBottom:12}}>
          {msgs.map(m=>{
            const rc=roleColor[m.profiles?.tipo]||roleColor.cliente;
            const ini=(m.profiles?.nome||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
            const timeStr=new Date(m.created_at).toLocaleTimeString("pt",{hour:"2-digit",minute:"2-digit"});
            return(
              <div key={m.id} style={{display:"flex",gap:10,marginBottom:14}}>
                <Av ini={ini} color={T.blue}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontWeight:600,fontSize:13,color:T.dark}}>{m.profiles?.nome||"Anónimo"}</span>
                    <span style={pill(rc.bg,rc.c,{fontSize:9})}>{m.profiles?.tipo||"cliente"}</span>
                    <span style={{fontSize:10,color:T.gray4,marginLeft:"auto"}}>{timeStr}</span>
                  </div>
                  <div style={{background:T.gray1,borderRadius:"4px 12px 12px 12px",padding:"9px 12px",fontSize:13,color:T.dark,lineHeight:1.55,marginBottom:5}}>{m.conteudo}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>vote(m.id,"up")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,border:`1px solid ${m._voted==="up"?T.green:T.gray3}`,background:m._voted==="up"?T.greenLt:"white",color:m._voted==="up"?T.green:T.gray4,fontSize:11,cursor:"pointer"}}><ThumbsUp size={10}/>{m.votos_up}</button>
                    <button onClick={()=>vote(m.id,"dn")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,border:`1px solid ${m._voted==="dn"?T.red:T.gray3}`,background:m._voted==="dn"?T.redLt:"white",color:m._voted==="dn"?T.red:T.gray4,fontSize:11,cursor:"pointer"}}><ThumbsDown size={10}/>{m.votos_down}</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
      )}
      {!user?(
        <div style={{background:T.gray2,borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:13,color:T.gray5,marginBottom:8}}>Precisas de uma conta para comentar</div>
          <button onClick={()=>onNeedAuth()} style={{padding:"9px 20px",borderRadius:20,border:"none",background:T.amber,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>Criar conta ou entrar</button>
        </div>
      ):(
        <div style={{display:"flex",gap:7}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Partilha info sobre combustível..." style={{flex:1,padding:"10px 14px",borderRadius:22,border:`1px solid ${T.gray3}`,fontSize:13,outline:"none"}}/>
          <button onClick={send} disabled={!input.trim()} style={{width:40,height:40,borderRadius:"50%",border:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:input.trim()?T.amber:T.gray2,color:input.trim()?"white":T.gray4,cursor:input.trim()?"pointer":"not-allowed"}}><Send size={15}/></button>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────
function DashboardTab({user,stations}){
  const myStation=stations.find(s=>s.nome?.toLowerCase().includes((user?.bomba_nome||"").toLowerCase().split(" ")[0])||false)||stations[0];
  const [stock,setStock]=useState(()=>{
    const obj={};
    FUEL_TYPES.forEach(f=>{obj[f.key]=myStation?.fuels?.[f.key]||false;});
    return obj;
  });
  const [fila,setFila]=useState(myStation?.fila||"baixa");
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);

  const save=async()=>{
    setSaving(true);
    try{
      await fuelAPI.updateAll(myStation.id, stock, fila, 0);
      setSaved(true);
      setTimeout(()=>setSaved(false),2500);
    }catch(e){ alert(e.message); }
    setSaving(false);
  };

  return(
    <div>
      <div style={{background:"linear-gradient(135deg,#1a1714,#3a2e26)",borderRadius:16,padding:"18px",marginBottom:16,color:"white"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:2}}>A gerir</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>{myStation?.nome||"A minha bomba"}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>{myStation?.endereco}</div>
      </div>
      <div style={{...card(),padding:"14px 16px",marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:12}}>Gerir disponibilidade</div>
        <div style={{display:"grid",gap:8,marginBottom:14}}>
          {FUEL_TYPES.map(f=>(
            <div key={f.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:stock[f.key]?f.color+"10":T.gray1,border:`1px solid ${stock[f.key]?f.color+"33":T.gray3}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><Dot color={stock[f.key]?f.color:T.gray3} size={10}/><span style={{fontSize:13,fontWeight:500,color:T.dark}}>{f.label}</span></div>
              <button onClick={()=>setStock({...stock,[f.key]:!stock[f.key]})} style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:stock[f.key]?T.green:T.red,color:"white"}}>{stock[f.key]?"Disponível":"Esgotado"}</button>
            </div>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:7}}>Fila actual</div>
          <div style={{display:"flex",gap:7}}>
            {[["baixa",T.green],["média",T.amber],["alta",T.red]].map(([q,c])=>(
              <button key={q} onClick={()=>setFila(q)} style={{flex:1,padding:"9px",borderRadius:10,border:`1.5px solid ${fila===q?c:T.gray3}`,background:fila===q?c+"18":"white",color:fila===q?c:T.gray4,fontSize:12,cursor:"pointer",fontWeight:fila===q?600:400}}>{q}</button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:saved?T.green:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background .3s"}}>
          {saved?<><Check size={15}/>Guardado!</>:<><Activity size={15}/>{saving?"A guardar...":"Actualizar agora"}</>}
        </button>
      </div>
    </div>
  );
}

// ─── STATION SHEET ────────────────────────────────────
function StationSheet({s,onClose,onReport,user,onNeedAuth}){
  const gmapsUrl=`https://www.google.com/maps/search/${encodeURIComponent(s.nome+", "+s.endereco)}`;
  const handleReport=()=>{ if(!user){onNeedAuth("Para confirmar precisas de uma conta.");return;} onReport(s); };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(2px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{position:"sticky",top:0,background:T.gray1,padding:"12px 20px 0",borderRadius:"24px 24px 0 0",zIndex:1}}>
          <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 14px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div style={{flex:1,paddingRight:10}}>
              <div style={{fontWeight:700,fontSize:17,color:T.dark,marginBottom:2}}>{s.nome}</div>
              <div style={{fontSize:12,color:T.gray4,marginBottom:6}}>{s.endereco}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <StatusPill status={s.status}/>
                {s.verificada&&<span style={pill("#eff6ff",T.blue)}><Shield size={9}/>Verificado</span>}
              </div>
            </div>
            <button onClick={onClose} style={{background:T.gray2,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.gray5,flexShrink:0}}><X size={15}/></button>
          </div>
          <div style={{height:1,background:T.gray3}}/>
        </div>
        <div style={{padding:"16px 20px 32px"}}>
          <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
            <div style={{fontSize:11,color:T.gray4,marginBottom:10,fontWeight:500}}>Combustíveis</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {FUEL_TYPES.map(f=>{
                const v=s.fuels?.[f.key];
                return(
                  <div key={f.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:v?f.color+"12":T.gray2,border:`1px solid ${v?f.color+"33":T.gray3}`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:v?f.color:T.gray3,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:v?T.dark:T.gray4}}>{FLAB[f.key]}</div>
                      <div style={{fontSize:10,color:v?T.green:T.red}}>{v?"disponível":"esgotado"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.gray2}`}}><span style={{fontSize:12,color:T.gray4}}>Marca</span><span style={{fontSize:12,fontWeight:500,color:T.dark}}>{s.marca}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.gray2}`}}><span style={{fontSize:12,color:T.gray4}}>Fila</span><span style={{fontSize:12,fontWeight:500,color:QUEUE_COLOR[s.fila]}}>{s.qn>0?`${s.qn} viaturas · ${s.fila}`:"sem fila"}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}><span style={{fontSize:12,color:T.gray4}}>Actualizado</span><span style={{fontSize:12,color:T.gray5}}>há {s.upd}</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" style={{padding:"12px",borderRadius:12,border:`1px solid ${T.gray3}`,background:"white",textAlign:"center",fontSize:13,color:T.dark,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontWeight:500}}><Navigation size={14} color={T.blue}/> Maps</a>
            <a href={`tel:${s.telefone}`} style={{padding:"12px",borderRadius:12,border:`1px solid ${T.gray3}`,background:"white",textAlign:"center",fontSize:13,color:T.dark,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontWeight:500}}><Phone size={14} color={T.green}/> Ligar</a>
          </div>
          <button onClick={handleReport} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><CheckCircle size={16}/> Confirmar abastecimento</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTA TAB ────────────────────────────────────────
function ContaTab({user,onNeedAuth,onLogout}){
  if(!user) return(
    <div style={{textAlign:"center",paddingTop:32}}>
      <div style={{width:64,height:64,borderRadius:20,background:T.amberLt,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={28} color={T.amber}/></div>
      <div style={{fontWeight:700,fontSize:18,color:T.dark,marginBottom:6}}>A tua conta FuelWatch</div>
      <div style={{fontSize:13,color:T.gray4,marginBottom:24,lineHeight:1.6}}>Com conta podes confirmar abastecimentos e participar no chat.</div>
      <button onClick={()=>onNeedAuth()} style={{padding:"13px 32px",borderRadius:14,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"block",margin:"0 auto 10px"}}>Criar conta ou entrar</button>
    </div>
  );
  const ini=user.nome?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?";
  return(
    <div>
      <div style={{background:"linear-gradient(135deg,#1a1714,#3a2e26)",borderRadius:20,padding:"20px",marginBottom:14,color:"white"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:54,height:54,borderRadius:"50%",background:"rgba(232,147,10,.25)",color:T.amber,fontWeight:700,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{ini}</div>
          <div>
            <div style={{fontWeight:700,fontSize:17}}>{user.nome}</div>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.7)"}}>{user.tipo}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          {[[user.pontos||0,"Pontos","🏆"],[user.total_reports||0,"Relatórios","📋"]].map(([v,l,ic])=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,.07)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:2}}>{ic}</div>
              <div style={{fontWeight:700,fontSize:16,color:"white"}}>{v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.gray2}`}}><span style={{fontSize:12,color:T.gray4}}>Email</span><span style={{fontSize:12,fontWeight:500,color:T.dark}}>{user.email}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.gray2}`}}><span style={{fontSize:12,color:T.gray4}}>Telefone</span><span style={{fontSize:12,color:T.dark}}>{user.telefone||"—"}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}><span style={{fontSize:12,color:T.gray4}}>Tipo</span><span style={{fontSize:12,fontWeight:500,color:T.dark}}>{user.tipo}</span></div>
      </div>
      <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid #fecaca`,background:T.redLt,color:T.red,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><LogOut size={14}/> Terminar sessão</button>
    </div>
  );
}

// ─── CRISIS BANNER ────────────────────────────────────
function CrisisBanner({stations}){
  const empty=stations.filter(s=>s.status==="sem stock").length;
  const pct=stations.length?Math.round((empty/stations.length)*100):0;
  const [dismissed,setDismissed]=useState(false);
  if(pct<25||dismissed)return null;
  const severe=pct>=50;
  return(
    <div style={{background:severe?"#7f1d1d":T.amberLt,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${severe?"#991b1b":T.amberBd}`}}>
      <div style={{width:32,height:32,borderRadius:10,background:severe?"rgba(255,255,255,.12)":T.amberBd,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Zap size={16} color={severe?"white":T.amber}/></div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:13,color:severe?"white":"#92400e"}}>{severe?"Crise severa":"Escassez detectada"}</div>
        <div style={{fontSize:11,color:severe?"rgba(255,255,255,.7)":"#b45309"}}>{pct}% das bombas sem stock · {empty}/{stations.length} afectadas</div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",color:severe?"rgba(255,255,255,.5)":"#b45309",padding:4}}><X size={15}/></button>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("mapa");
  const [city,setCity]=useState("Maputo");
  const [user,setUser]=useState(null);
  const [stations,setStations]=useState([]);
  const [prices,setPrices]=useState([]);
  const [selStation,setSelStation]=useState(null);
  const [reportStation,setReportStation]=useState(null);
  const [authReason,setAuthReason]=useState(null);
  const [toast,setToast]=useState(null);
  const [loadingStations,setLoadingStations]=useState(true);

  const showToast=(m)=>{ setToast(m); setTimeout(()=>setToast(null),3000); };

  // Auth state
  useEffect(()=>{
    authAPI.getUser().then(async u=>{
      if(u){
        try{
          const profile = await supabase.from("profiles").select("*").eq("id",u.id).single().then(r=>r.data);
          setUser({...profile, email:u.email});
        }catch(e){ setUser({nome:u.email?.split("@")[0]||"Utilizador",email:u.email,tipo:"cliente",pontos:0,total_reports:0}); }
      }
    });
    const {data:{subscription}} = authAPI.onAuthChange(async(event,session)=>{
      if(event==="SIGNED_IN"&&session){
        const profile = await supabase.from("profiles").select("*").eq("id",session.user.id).single().then(r=>r.data);
        setUser({...profile, email:session.user.email});
      } else if(event==="SIGNED_OUT"){
        setUser(null);
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // Load stations
  useEffect(()=>{
    setLoadingStations(true);
    stationsAPI.getByCity(city).then(data=>{
      setStations(data.map(parseStation));
      setLoadingStations(false);
    }).catch(()=>setLoadingStations(false));

    const sub=stationsAPI.subscribeCity(city,()=>{
      stationsAPI.getByCity(city).then(data=>setStations(data.map(parseStation)));
    });
    return ()=>{ supabase.removeChannel(sub); };
  },[city]);

  // Load prices
  useEffect(()=>{
    pricesAPI.getLatest().then(setPrices);
  },[]);

  const handleAuthSuccess=(profile)=>{
    setUser(profile);
    setAuthReason(null);
    showToast(`Bem-vindo(a), ${profile.nome?.split(" ")[0]}! 👋`);
  };

  const handleReport=async(reportData)=>{
    try{
      await reportsAPI.create(reportData);
      setReportStation(null);
      setSelStation(null);
      showToast("✓ Abastecimento confirmado! +5 pontos");
      // Refresh stations
      stationsAPI.getByCity(city).then(data=>setStations(data.map(parseStation)));
    }catch(e){ alert(e.message); }
  };

  const handleLogout=async()=>{
    await authAPI.logout();
    setUser(null);
    setTab("mapa");
    showToast("Sessão terminada.");
  };

  const hasDashboard=user&&(user.tipo==="proprietário"||user.tipo==="funcionário");
  const TABS=[
    {id:"mapa",    label:"Mapa",    icon:MapPin},
    {id:"bombas",  label:"Bombas",  icon:Fuel},
    {id:"precos",  label:"Preços",  icon:TrendingUp},
    {id:"noticias",label:"Notícias",icon:Newspaper},
    {id:"chat",    label:"Chat",    icon:MessageSquare},
    ...(hasDashboard?[{id:"dash",label:"Dashboard",icon:BarChart2}]:[]),
    {id:"conta",   label:"Conta",   icon:User},
  ];

  return(
    <div style={{fontFamily:"-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif",maxWidth:480,margin:"0 auto",background:T.gray1,minHeight:"100vh",paddingBottom:72,position:"relative"}}>
      {/* Header */}
      <div style={{background:"white",borderBottom:`1px solid ${T.gray3}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.amber,display:"flex",alignItems:"center",justifyContent:"center"}}><Fuel size={17} color="white"/></div>
            <div>
              <span style={{fontWeight:700,fontSize:16,color:T.dark,letterSpacing:-.3}}>FuelWatch</span>
              <span style={{marginLeft:6,fontSize:9,background:T.greenLt,color:T.green,padding:"1px 6px",borderRadius:20,fontWeight:600}}>AO VIVO</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <select value={city} onChange={e=>setCity(e.target.value)} style={{fontSize:12,padding:"5px 8px",borderRadius:9,border:`1px solid ${T.gray3}`,background:"white",cursor:"pointer",fontWeight:500}}>
              {CITIES.map(c=><option key={c}>{c}</option>)}
            </select>
            {user
              ?<Av ini={user.nome?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?"} color={T.amber} size={34}/>
              :<button onClick={()=>setAuthReason("")} style={{padding:"7px 12px",borderRadius:20,border:"none",background:T.amber,color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>Entrar</button>
            }
          </div>
        </div>
        <div style={{padding:"0 14px 10px",display:"flex",gap:7,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:T.greenLt,color:T.green}}>{stations.filter(s=>s.status!=="sem stock").length} com stock</span>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:T.redLt,color:T.red}}>{stations.filter(s=>s.status==="sem stock").length} sem stock</span>
          <span style={{marginLeft:"auto",fontSize:10,color:T.gray4,display:"flex",alignItems:"center",gap:3}}><Radio size={9}/>{new Date().toLocaleTimeString("pt",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
        <CrisisBanner stations={stations}/>
      </div>

      {/* Content */}
      <div style={{padding:"14px 14px 16px"}}>
        <h2 style={{margin:"0 0 12px",fontWeight:700,fontSize:17,color:T.dark,letterSpacing:-.3}}>
          {{mapa:"Mapa de combustível",bombas:"Bombas de abastecimento",precos:"Preços oficiais",noticias:"Feed de notícias",chat:"Comunidade",dash:"Dashboard",conta:user?"A minha conta":"Entrar / Registar"}[tab]}
        </h2>
        {loadingStations&&(tab==="mapa"||tab==="bombas")?<Spinner/>:
          tab==="mapa"    ?<MapTab stations={stations} onSelectStation={setSelStation}/>:
          tab==="bombas"  ?<BombasTab stations={stations} onSelectStation={setSelStation}/>:
          tab==="precos"  ?<PrecosTab prices={prices}/>:
          tab==="noticias"?<NoticiasTab city={city}/>:
          tab==="chat"    ?<ChatTab user={user} onNeedAuth={setAuthReason} stations={stations}/>:
          tab==="dash"&&hasDashboard?<DashboardTab user={user} stations={stations}/>:
          tab==="conta"   ?<ContaTab user={user} onNeedAuth={setAuthReason} onLogout={handleLogout}/>:null
        }
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:`1px solid ${T.gray3}`,display:"flex",zIndex:90,boxSizing:"border-box"}}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 2px 10px",background:"none",border:"none",cursor:"pointer",color:tab===id?T.amber:T.gray4,position:"relative",minWidth:0}}>
            <Icon size={18}/>
            <span style={{fontSize:9,fontWeight:tab===id?700:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{label}</span>
            {tab===id&&<span style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:20,height:2,borderRadius:2,background:T.amber}}/>}
          </button>
        ))}
      </div>

      {/* Overlays */}
      {selStation&&<StationSheet s={selStation} onClose={()=>setSelStation(null)} onReport={setReportStation} user={user} onNeedAuth={setAuthReason}/>}
      {reportStation&&<ReportModal s={reportStation} onClose={()=>setReportStation(null)} onDone={handleReport}/>}
      {authReason!==null&&<AuthModal reason={authReason} onClose={()=>setAuthReason(null)} onSuccess={handleAuthSuccess}/>}
      {toast&&<Toast msg={toast}/>}

      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${T.gray3};border-radius:4px;}@keyframes spin{to{transform:rotate(360deg)}}input,textarea,select{font-family:inherit;}button{font-family:inherit;}`}</style>
    </div>
  );
}
