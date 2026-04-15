import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin, Fuel, MessageSquare, User, TrendingUp, Newspaper,
  LogOut, Bell, Search, ChevronRight, Check, X, AlertTriangle,
  Clock, Phone, RefreshCw, Send, ThumbsUp, ThumbsDown, BarChart2,
  Package, Activity, Users, CheckCircle, Lock, ExternalLink, Zap,
  Award, Filter, Star, Eye, EyeOff, Shield, Settings, ChevronDown,
  Navigation, ArrowUp, ArrowDown, Camera, Layers, Radio
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  amber:   "#e8930a",
  amberLt: "#fff7e6",
  amberBd: "#fcd34d",
  green:   "#16a34a",
  greenLt: "#f0fdf4",
  red:     "#dc2626",
  redLt:   "#fef2f2",
  blue:    "#2563eb",
  purple:  "#7c3aed",
  teal:    "#0891b2",
  pink:    "#db2777",
  gray1:   "#f8f7f4",   // page bg
  gray2:   "#f0ede8",   // section bg
  gray3:   "#e2ddd6",   // border
  gray4:   "#9a9085",   // text-muted
  gray5:   "#4a453f",   // text-secondary
  dark:    "#1a1714",   // text-primary
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const FUEL_TYPES = [
  { key:"g87",    label:"Gasolina 87",      price:89.00,  unit:"MZN/L",       color:T.amber  },
  { key:"g95",    label:"Gasolina 95",      price:94.00,  unit:"MZN/L",       color:"#f97316"},
  { key:"diesel", label:"Diesel",           price:84.00,  unit:"MZN/L",       color:T.blue   },
  { key:"petro",  label:"Petróleo",         price:65.00,  unit:"MZN/L",       color:T.purple },
  { key:"gpl",    label:"Gás GPL 12,5kg",   price:1850.0, unit:"MZN/garrafa", color:T.green  },
];
const FLAB = { g87:"G87", g95:"G95", diesel:"Diesel", petro:"Petróleo", gpl:"GPL" };
const CITIES = ["Maputo","Matola","Beira","Nampula","Pemba","Quelimane","Tete","Inhambane"];

const mkHist = (g=0.7, d=0.6) => Array.from({length:24},(_,i)=>{
  const h = new Date(); h.setHours(h.getHours()-(23-i));
  return {
    t: h.toLocaleTimeString("pt",{hour:"2-digit",minute:"2-digit"}),
    g87: Math.max(0,Math.min(100,Math.round((g+(Math.random()-.5)*.5)*100))),
    diesel: Math.max(0,Math.min(100,Math.round((d+(Math.random()-.5)*.5)*100))),
  };
});

const STATIONS = [
  {id:1,name:"Galp Sommerschield",  brand:"Galp",          city:"Maputo",addr:"Av. Julius Nyerere, Sommerschield",  px:68,py:28,fuels:{g87:true, g95:true, diesel:false,petro:false,gpl:false},queue:"alta",   qn:45,status:"parcial",   upd:"8 min", phone:"+258 21 490 000",verified:true, reports:14,rating:4.2,hist:mkHist(.85,.1)},
  {id:2,name:"Total Polana",        brand:"TotalEnergies", city:"Maputo",addr:"Av. 24 de Julho, Polana",            px:76,py:40,fuels:{g87:true, g95:false,diesel:true, petro:true, gpl:true}, queue:"média",  qn:18,status:"disponível",upd:"3 min", phone:"+258 21 491 234",verified:true, reports:9, rating:4.6,hist:mkHist(.8,.8)},
  {id:3,name:"Puma Baixa",          brand:"Puma",          city:"Maputo",addr:"Av. 25 de Setembro, Baixa",          px:58,py:57,fuels:{g87:false,g95:false,diesel:false,petro:false,gpl:false},queue:"nenhuma",qn:0, status:"sem stock", upd:"22 min",phone:"+258 21 303 000",verified:true, reports:27,rating:2.1,hist:mkHist(.1,.05)},
  {id:4,name:"Enacol Matola",       brand:"Enacol",        city:"Maputo",addr:"EN4, Matola",                        px:30,py:46,fuels:{g87:true, g95:false,diesel:true, petro:false,gpl:false},queue:"baixa",  qn:7, status:"disponível",upd:"15 min",phone:"+258 21 771 500",verified:false,reports:6, rating:3.8,hist:mkHist(.7,.65)},
  {id:5,name:"Galp Machava",        brand:"Galp",          city:"Maputo",addr:"Av. Acordos de Lusaka, Machava",     px:24,py:36,fuels:{g87:false,g95:false,diesel:true, petro:true, gpl:false},queue:"média",  qn:22,status:"parcial",   upd:"5 min", phone:"+258 21 770 100",verified:true, reports:13,rating:3.5,hist:mkHist(.2,.72)},
  {id:6,name:"Total Aeroporto",     brand:"TotalEnergies", city:"Maputo",addr:"Av. de Moçambique, Aeroporto",       px:46,py:24,fuels:{g87:true, g95:true, diesel:true, petro:false,gpl:true}, queue:"baixa",  qn:5, status:"disponível",upd:"1 min", phone:"+258 21 465 000",verified:true, reports:21,rating:4.8,hist:mkHist(.9,.88)},
  {id:7,name:"Puma Polana Caniço",  brand:"Puma",          city:"Maputo",addr:"EN1, Polana Caniço",                 px:84,py:62,fuels:{g87:false,g95:false,diesel:false,petro:false,gpl:true}, queue:"alta",   qn:38,status:"parcial",   upd:"30 min",phone:"+258 21 450 000",verified:false,reports:8, rating:2.8,hist:mkHist(.05,.1)},
  {id:8,name:"Enacol KaMubukwana",  brand:"Enacol",        city:"Maputo",addr:"Av. Machava, KaMubukwana",           px:16,py:56,fuels:{g87:true, g95:false,diesel:false,petro:false,gpl:false},queue:"alta",   qn:62,status:"parcial",   upd:"12 min",phone:"+258 21 760 000",verified:true, reports:17,rating:3.2,hist:mkHist(.6,.05)},
];

const MSGS0 = [
  {id:1,user:"João Machava", role:"cliente",    time:"09:14",msg:"Galp Sommerschield tem G87 mas fila enorme — ~45 viaturas. Levei quase 1 hora.",av:"JM",color:T.blue,  up:12,dn:1, voted:null,sid:1},
  {id:2,user:"Maria Sitoe",  role:"funcionário",time:"09:22",msg:"🏪 Total Polana: acabou de chegar diesel. Fila razoável agora, estimativa ~20 min.",av:"MS",color:T.green, up:24,dn:0, voted:null,sid:2},
  {id:3,user:"Carlos Alves", role:"cliente",    time:"09:35",msg:"Puma Baixa completamente sem stock desde ontem à tarde. Não percam tempo.",av:"CA",color:T.red,  up:19,dn:2, voted:null,sid:3},
  {id:4,user:"Ana Fernandes",role:"proprietário",time:"09:41",msg:"✅ Total Aeroporto: G87, G95, diesel e GPL todos disponíveis. Fila mínima agora.",av:"AF",color:T.purple,up:31,dn:0, voted:null,sid:6},
  {id:5,user:"Pedro Langa",  role:"cliente",    time:"09:58",msg:"Acabei de abastecer no Enacol Matola — diesel e G87 ok, fila curta de 7 carros.",av:"PL",color:T.teal,  up:8, dn:1, voted:null,sid:4},
  {id:6,user:"Sónia Nhaca",  role:"cliente",    time:"10:15",msg:"Galp Machava tem diesel agora? Estou a 10 minutos e preciso de decidir.",av:"SN",color:T.pink,  up:2, dn:0, voted:null,sid:5},
];

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const card = (extra={}) => ({ background:"white", borderRadius:16, border:`1px solid ${T.gray3}`, ...extra });
const pill = (bg,color,extra={}) => ({ background:bg, color, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4, ...extra });

function Dot({color,size=7}){
  return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:color,flexShrink:0}}/>;
}
function StatusPill({status}){
  const m={disponível:{bg:T.greenLt,c:T.green,dot:"#22c55e"},parcial:{bg:T.amberLt,c:"#b45309",dot:T.amber},"sem stock":{bg:T.redLt,c:T.red,dot:T.red}}[status]||{};
  return <span style={pill(m.bg,m.c)}><Dot color={m.dot} size={5}/>{status}</span>;
}
function RolePill({role}){
  const m={proprietário:{bg:"#faf5ff",c:T.purple},funcionário:{bg:T.greenLt,c:"#059669"},cliente:{bg:"#eff6ff",c:T.blue}}[role]||{};
  return <span style={pill(m.bg,m.c)}>{role}</span>;
}
function Av({ini,color,size=34}){
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",color,fontWeight:600,fontSize:Math.round(size*.33),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ini}</div>;
}
function Stars({rating}){
  return <span style={{fontSize:11,color:T.amber,letterSpacing:-1}}>{Array.from({length:5},(_,i)=>i<Math.round(rating)?"★":"☆").join("")} <span style={{color:T.gray4}}>{rating.toFixed(1)}</span></span>;
}
function Spinner(){
  return <div style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${T.amberLt}`,borderTopColor:T.amber,animation:"spin .7s linear infinite",margin:"32px auto"}}/>;
}
function FuelChips({fuels,small}){
  return <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
    {Object.entries(fuels).map(([k,v])=>(
      <span key={k} style={{fontSize:small?9:10,fontWeight:500,padding:"2px 7px",borderRadius:20,
        background:v?"#f0fdf4":T.gray2,color:v?T.green:T.gray4,
        border:`1px solid ${v?"#bbf7d0":T.gray3}`,
        textDecoration:v?"none":"line-through",whiteSpace:"nowrap"
      }}>{FLAB[k]}</span>
    ))}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AuthModal({onClose,onSuccess,reason}){
  const [mode,setMode]=useState("login");
  const [showPwd,setShowPwd]=useState(false);
  const [err,setErr]=useState(null);
  const [form,setForm]=useState({nome:"",email:"",tel:"",tipo:"cliente",bomba:"",pwd:""});

  const doLogin=(e)=>{
    e.preventDefault();
    if(!form.email||!form.pwd){setErr("Preencha email e senha.");return;}
    onSuccess({nome:"Utilizador Demo",email:form.email,tel:"+258 84 000 000",tipo:"cliente",pts:0,reports:0});
  };
  const doRegister=(e)=>{
    e.preventDefault();
    if(!form.nome||!form.email||!form.tel||!form.pwd){setErr("Todos os campos são obrigatórios.");return;}
    if(form.pwd.length<6){setErr("A senha deve ter pelo menos 6 caracteres.");return;}
    onSuccess({nome:form.nome,email:form.email,tel:form.tel,tipo:form.tipo,bomba:form.bomba,pts:0,reports:0});
  };
  const inp = (p={}) => ({
    style:{width:"100%",padding:"11px 14px",borderRadius:10,border:`1px solid ${T.gray3}`,fontSize:13,
      boxSizing:"border-box",background:"white",color:T.dark,outline:"none"},
    ...p
  });

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
        <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 20px"}}/>

        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:16,background:T.amberLt,margin:"0 auto 10px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Lock size={20} color={T.amber}/>
          </div>
          <div style={{fontWeight:600,fontSize:17,color:T.dark,marginBottom:4}}>Acesso necessário</div>
          <div style={{fontSize:13,color:T.gray4}}>{reason||"Inicia sessão para participar na comunidade"}</div>
        </div>

        <div style={{display:"flex",background:T.gray2,borderRadius:12,padding:3,marginBottom:18}}>
          {[["login","Entrar"],["reg","Criar conta"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr(null);}} style={{flex:1,padding:"9px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:mode===m?600:400,background:mode===m?"white":T.gray2,color:mode===m?T.dark:T.gray4,boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.08)":"none"}}>{l}</button>
          ))}
        </div>

        {err&&<div style={{background:T.redLt,color:T.red,fontSize:12,padding:"8px 12px",borderRadius:8,marginBottom:12,border:`1px solid #fecaca`}}>{err}</div>}

        {mode==="login"?(
          <form onSubmit={doLogin} style={{display:"grid",gap:10}}>
            <input {...inp()} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
            <div style={{position:"relative"}}>
              <input {...inp()} type={showPwd?"text":"password"} value={form.pwd} onChange={e=>setForm({...form,pwd:e.target.value})} placeholder="Senha" style={{...inp().style,paddingRight:42}}/>
              <button type="button" onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.gray4}}>{showPwd?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
            <button type="submit" style={{padding:"12px",borderRadius:12,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:4}}>Entrar</button>
            <div style={{textAlign:"center",fontSize:12,color:T.gray4}}>Ainda não tens conta? <button type="button" onClick={()=>setMode("reg")} style={{background:"none",border:"none",color:T.blue,cursor:"pointer",fontSize:12,fontWeight:500}}>Regista-te</button></div>
          </form>
        ):(
          <form onSubmit={doRegister} style={{display:"grid",gap:10}}>
            <input {...inp()} value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome completo"/>
            <input {...inp()} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
            <input {...inp()} value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="Telefone (+258 8X XXX XXXX)"/>
            <div>
              <div style={{fontSize:12,color:T.gray5,marginBottom:7,fontWeight:500}}>Tipo de utilizador</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {[["cliente","👤","Cliente"],["funcionário","⚙️","Funcionário"],["proprietário","🏪","Proprietário"]].map(([v,ic,l])=>(
                  <button type="button" key={v} onClick={()=>setForm({...form,tipo:v})} style={{padding:"9px 4px",borderRadius:10,border:`1.5px solid ${form.tipo===v?T.amber:T.gray3}`,background:form.tipo===v?T.amberLt:"white",color:form.tipo===v?"#92400e":T.gray4,fontSize:11,cursor:"pointer",fontWeight:form.tipo===v?600:400}}>{ic} {l}</button>
                ))}
              </div>
            </div>
            {form.tipo!=="cliente"&&<input {...inp()} value={form.bomba} onChange={e=>setForm({...form,bomba:e.target.value})} placeholder="Nome da bomba onde trabalha"/>}
            <div style={{position:"relative"}}>
              <input {...inp()} type={showPwd?"text":"password"} value={form.pwd} onChange={e=>setForm({...form,pwd:e.target.value})} placeholder="Senha (mín. 6 caracteres)" style={{...inp().style,paddingRight:42}}/>
              <button type="button" onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.gray4}}>{showPwd?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
            <div style={{fontSize:10,color:T.gray4,lineHeight:1.5}}>Os teus dados são partilhados com a comunidade FuelWatch para fins de utilidade pública. Ao registares-te aceitas os nossos Termos de Uso.</div>
            <button type="submit" style={{padding:"12px",borderRadius:12,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:4}}>Criar conta gratuita</button>
          </form>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATION DETAIL SHEET
// ─────────────────────────────────────────────────────────────────────────────
function StationSheet({s,onClose,onReport,user,onNeedAuth}){
  const [histFuel,setHistFuel]=useState("g87");
  const qColor=QUEUE_COLOR[s.queue]||T.gray4;
  const histData=s.hist;
  const lastG87=histData[histData.length-1]?.g87||0;
  const lastDsl=histData[histData.length-1]?.diesel||0;

  const gmapsUrl=`https://www.google.com/maps/search/${encodeURIComponent(s.name+", "+s.addr)}`;

  const handleReport=()=>{
    if(!user){onNeedAuth("Para confirmar abastecimentos precisas de uma conta FuelWatch.");return;}
    onReport(s);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(2px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box"}}>
        <div style={{position:"sticky",top:0,background:T.gray1,padding:"12px 20px 0",borderRadius:"24px 24px 0 0",zIndex:1}}>
          <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 14px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div style={{flex:1,paddingRight:10}}>
              <div style={{fontWeight:700,fontSize:17,color:T.dark,marginBottom:2}}>{s.name}</div>
              <div style={{fontSize:12,color:T.gray4,marginBottom:6}}>{s.addr}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <StatusPill status={s.status}/>
                <Stars rating={s.rating}/>
                {s.verified&&<span style={pill("#eff6ff",T.blue)}><Shield size={9}/>Verificado</span>}
              </div>
            </div>
            <button onClick={onClose} style={{background:T.gray2,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.gray5,flexShrink:0}}><X size={15}/></button>
          </div>
          <div style={{height:1,background:T.gray3,marginBottom:0}}/>
        </div>

        <div style={{padding:"16px 20px 32px"}}>
          {/* Queue + update */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",...card(),padding:"12px 16px",marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:T.gray4,marginBottom:3}}>Fila de espera</div>
              <div style={{fontWeight:700,fontSize:18,color:qColor}}>{s.qn>0?`${s.qn} viaturas`:"Sem fila"}</div>
              <div style={{fontSize:11,color:T.gray4,marginTop:1}}>intensidade: <span style={{color:qColor,fontWeight:500}}>{s.queue}</span></div>
            </div>
            <div style={{width:56,height:56,borderRadius:"50%",background:qColor+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Users size={22} color={qColor}/>
            </div>
          </div>

          {/* Fuel availability */}
          <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
            <div style={{fontSize:11,color:T.gray4,marginBottom:10,fontWeight:500}}>Combustíveis disponíveis</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {Object.entries(s.fuels).map(([k,v])=>{
                const ft=FUEL_TYPES.find(f=>f.key===k);
                return (
                  <div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,background:v?ft?.color+"12":T.gray2,border:`1px solid ${v?ft?.color+"33":T.gray3}`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:v?ft?.color:T.gray3,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:v?T.dark:T.gray4}}>{FLAB[k]}</div>
                      <div style={{fontSize:10,color:v?T.green:T.red}}>{v?"disponível":"esgotado"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History chart */}
          <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:T.gray4,fontWeight:500}}>Histórico de disponibilidade (24h)</div>
              <div style={{display:"flex",gap:4}}>
                {[["g87","G87",T.amber],["diesel","Diesel",T.blue]].map(([k,l,c])=>(
                  <button key={k} onClick={()=>setHistFuel(k)} style={{fontSize:10,padding:"3px 8px",borderRadius:20,border:`1px solid ${histFuel===k?c:T.gray3}`,background:histFuel===k?c+"18":"white",color:histFuel===k?c:T.gray4,cursor:"pointer",fontWeight:histFuel===k?600:400}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{height:100}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={histData} margin={{top:0,right:0,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={histFuel==="g87"?T.amber:T.blue} stopOpacity={.3}/>
                      <stop offset="100%" stopColor={histFuel==="g87"?T.amber:T.blue} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{fontSize:8,fill:T.gray4}} interval={5} tickLine={false} axisLine={false}/>
                  <YAxis domain={[0,100]} tick={{fontSize:8,fill:T.gray4}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{background:"white",border:`1px solid ${T.gray3}`,borderRadius:8,fontSize:11}} formatter={(v)=>[`${v}%`,"Nível"]} labelStyle={{color:T.gray5}}/>
                  <Area type="monotone" dataKey={histFuel} stroke={histFuel==="g87"?T.amber:T.blue} strokeWidth={2} fill="url(#ag)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
              <span style={{color:T.gray4}}>Nível actual</span>
              <span style={{fontWeight:600,color:histFuel==="g87"?T.amber:T.blue}}>{histFuel==="g87"?lastG87:lastDsl}%</span>
            </div>
          </div>

          {/* Info + actions */}
          <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.gray2}`}}>
              <span style={{fontSize:12,color:T.gray4}}>Marca</span>
              <span style={{fontSize:12,fontWeight:500,color:T.dark}}>{s.brand}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.gray2}`}}>
              <span style={{fontSize:12,color:T.gray4}}>Telefone</span>
              <a href={`tel:${s.phone}`} style={{fontSize:12,fontWeight:500,color:T.blue,textDecoration:"none"}}>{s.phone}</a>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.gray2}`}}>
              <span style={{fontSize:12,color:T.gray4}}>Última confirmação</span>
              <span style={{fontSize:12,color:T.gray5}}>há {s.upd}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
              <span style={{fontSize:12,color:T.gray4}}>Confirmações</span>
              <span style={{fontSize:12,fontWeight:500,color:T.dark}}>{s.reports} da comunidade</span>
            </div>
          </div>

          {/* CTAs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" style={{padding:"12px",borderRadius:12,border:`1px solid ${T.gray3}`,background:"white",textAlign:"center",fontSize:13,color:T.dark,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontWeight:500}}>
              <Navigation size={14} color={T.blue}/> Google Maps
            </a>
            <a href={`tel:${s.phone}`} style={{padding:"12px",borderRadius:12,border:`1px solid ${T.gray3}`,background:"white",textAlign:"center",fontSize:13,color:T.dark,textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontWeight:500}}>
              <Phone size={14} color={T.green}/> Ligar
            </a>
          </div>
          <button onClick={handleReport} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,letterSpacing:.2}}>
            <CheckCircle size={16}/> Confirmar abastecimento agora
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ReportModal({s,onClose,onDone}){
  const [fuel,setFuel]=useState(null);
  const [queue,setQueue]=useState("média");
  const [note,setNote]=useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(2px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.gray1,borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
        <div style={{width:36,height:4,borderRadius:4,background:T.gray3,margin:"0 auto 14px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontWeight:700,fontSize:16,color:T.dark}}>Confirmar abastecimento</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.gray4,padding:4}}><X size={17}/></button>
        </div>
        <div style={{fontSize:12,color:T.gray4,marginBottom:16}}>{s.name}</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:8}}>Que combustível abasteceste?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {FUEL_TYPES.map(f=>(
              <button key={f.key} onClick={()=>setFuel(f.key)} style={{padding:"11px",borderRadius:10,border:`1.5px solid ${fuel===f.key?f.color:T.gray3}`,background:fuel===f.key?f.color+"18":"white",color:fuel===f.key?f.color:T.gray5,fontSize:12,cursor:"pointer",fontWeight:fuel===f.key?600:400,textAlign:"left"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:f.color,marginBottom:4}}/>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:8}}>Tamanho da fila agora</div>
          <div style={{display:"flex",gap:7}}>
            {[["baixa",T.green],["média",T.amber],["alta",T.red]].map(([q,c])=>(
              <button key={q} onClick={()=>setQueue(q)} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${queue===q?c:T.gray3}`,background:queue===q?c+"18":"white",color:queue===q?c:T.gray4,fontSize:12,cursor:"pointer",fontWeight:queue===q?600:400}}>{q}</button>
            ))}
          </div>
        </div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota adicional (opcional — ex: fila a andar bem, só diesel 95...)" rows={2} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.gray3}`,fontSize:13,resize:"none",boxSizing:"border-box",color:T.dark,background:"white",outline:"none"}}/>
        <button onClick={()=>fuel&&onDone({s,fuel,queue,note})} disabled={!fuel} style={{marginTop:12,width:"100%",padding:"13px",borderRadius:13,border:"none",background:fuel?T.amber:T.gray2,color:fuel?"white":T.gray4,fontSize:14,fontWeight:700,cursor:fuel?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          <CheckCircle size={15}/> Confirmar e partilhar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP TAB
// ─────────────────────────────────────────────────────────────────────────────
const QUEUE_COLOR={"baixa":T.green,"média":T.amber,"alta":T.red,"nenhuma":T.gray4};

function MapTab({stations,onSelectStation}){
  const sdot={"disponível":"#22c55e","parcial":T.amber,"sem stock":T.red};
  const W=400,H=260;
  return (
    <div>
      {/* Map SVG */}
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.gray3}`,marginBottom:14,position:"relative"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{display:"block",width:"100%",height:"auto",background:"#e8f4f8"}} xmlns="http://www.w3.org/2000/svg">
          <path d="M318 0 L400 0 L400 260 L330 260 L295 215 L298 175 L316 135 L325 95 L318 55 Z" fill="#bfdbfe" opacity=".75"/>
          <text x="340" y="125" fontSize="9" fill="#60a5fa" fontWeight="500" textAnchor="middle">Baía de</text>
          <text x="340" y="137" fontSize="9" fill="#60a5fa" fontWeight="500" textAnchor="middle">Maputo</text>
          {[[0,108,W,108,1.5],[0,72,318,72,1],[0,150,298,150,1],[0,195,280,195,.8]].map(([x1,y1,x2,y2,sw],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={sw}/>
          ))}
          {[[96,0,96,260,1.5],[192,0,192,260,1],[48,0,48,260,.7],[144,0,144,260,.7],[240,0,240,260,.7]].map(([x1,y1,x2,y2,sw],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth={sw}/>
          ))}
          {[["Machava",12,20],["Matola",12,122],["KaMubukwana",12,165],["Aeroporto",100,18],["Sommerschield",195,20],["Polana",196,124],["Baixa",196,168],["Coop",240,60]].map(([t,x,y])=>(
            <text key={t} x={x} y={y} fontSize="7.5" fill="#9ca3af" fontWeight="500">{t}</text>
          ))}
          <text x="2" y="106" fontSize="6" fill="#c4b5a0">EN4 / Av. Acordos de Lusaka</text>
          {stations.map(s=>{
            const cx=(s.px/100)*W, cy=(s.py/100)*H;
            const col=sdot[s.status]||T.amber;
            return (
              <g key={s.id} style={{cursor:"pointer"}} onClick={()=>onSelectStation(s)}>
                <circle cx={cx} cy={cy} r={10} fill={col} stroke="white" strokeWidth={2.5}/>
                <text x={cx} y={cy+4} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">⛽</text>
              </g>
            );
          })}
        </svg>
        <div style={{position:"absolute",bottom:8,left:8,background:"rgba(255,255,255,.93)",borderRadius:10,padding:"7px 10px"}}>
          {[["disponível","#22c55e"],["parcial",T.amber],["sem stock",T.red]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,fontSize:10,color:T.dark}}><Dot color={c}/>{l}</div>
          ))}
        </div>
      </div>

      {/* Quick list below map */}
      <div style={{display:"grid",gap:8}}>
        {[...stations].sort((a,b)=>{const o={"disponível":0,"parcial":1,"sem stock":2};return o[a.status]-o[b.status];}).slice(0,4).map(s=>(
          <button key={s.id} onClick={()=>onSelectStation(s)} style={{...card(),padding:"12px 14px",cursor:"pointer",border:`1px solid ${T.gray3}`,background:"white",textAlign:"left",width:"100%",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:{"disponível":T.greenLt,"parcial":T.amberLt,"sem stock":T.redLt}[s.status],display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>⛽</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:T.dark,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <StatusPill status={s.status}/>
                <span style={{fontSize:11,color:QUEUE_COLOR[s.queue],fontWeight:500}}><Users size={10} style={{display:"inline",verticalAlign:"middle"}}/> {s.qn>0?`${s.qn} viat.`:"livre"}</span>
              </div>
            </div>
            <ChevronRight size={16} color={T.gray4}/>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOMBAS TAB
// ─────────────────────────────────────────────────────────────────────────────
function BombasTab({stations,onSelectStation}){
  const [q,setQ]=useState("");
  const [flt,setFlt]=useState("todos");
  const [sort,setSort]=useState("status");

  const filtered=useMemo(()=>{
    let list=stations;
    if(q) list=list.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.addr.toLowerCase().includes(q.toLowerCase()));
    if(flt!=="todos") list=list.filter(s=>s.status===flt);
    if(sort==="status"){const o={"disponível":0,"parcial":1,"sem stock":2};list=[...list].sort((a,b)=>o[a.status]-o[b.status]);}
    if(sort==="fila") list=[...list].sort((a,b)=>a.qn-b.qn);
    if(sort==="nota") list=[...list].sort((a,b)=>b.rating-a.rating);
    return list;
  },[stations,q,flt,sort]);

  return (
    <div>
      {/* Search */}
      <div style={{position:"relative",marginBottom:10}}>
        <Search size={15} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.gray4}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar bomba ou zona..." style={{width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,border:`1px solid ${T.gray3}`,fontSize:13,boxSizing:"border-box",background:"white",color:T.dark,outline:"none"}}/>
        {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.gray4}}><X size={14}/></button>}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
        {[["todos","Todas"],["disponível","Com stock"],["parcial","Parcial"],["sem stock","Sem stock"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFlt(v)} style={{flexShrink:0,padding:"6px 12px",borderRadius:20,border:`1px solid ${flt===v?T.amber:T.gray3}`,background:flt===v?T.amberLt:"white",color:flt===v?"#92400e":T.gray5,fontSize:12,cursor:"pointer",fontWeight:flt===v?600:400}}>{l}</button>
        ))}
        <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
          <span style={{fontSize:11,color:T.gray4,whiteSpace:"nowrap"}}>Ordenar:</span>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{fontSize:11,padding:"5px 8px",borderRadius:8,border:`1px solid ${T.gray3}`,background:"white",color:T.dark,cursor:"pointer"}}>
            <option value="status">Estado</option>
            <option value="fila">Fila (menor)</option>
            <option value="nota">Avaliação</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div style={{fontSize:12,color:T.gray4,marginBottom:10}}>{filtered.length} bombas encontradas</div>

      {/* List */}
      <div style={{display:"grid",gap:8}}>
        {filtered.map(s=>(
          <button key={s.id} onClick={()=>onSelectStation(s)} style={{...card(),padding:"14px 16px",cursor:"pointer",textAlign:"left",width:"100%",border:`1px solid ${T.gray3}`,background:"white"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div style={{flex:1,paddingRight:8}}>
                <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:2}}>
                  {s.name}
                  {s.verified&&<span style={{marginLeft:6,fontSize:10,color:T.blue}}>✓</span>}
                </div>
                <div style={{fontSize:11,color:T.gray4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.addr}</div>
              </div>
              <StatusPill status={s.status}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:QUEUE_COLOR[s.queue],fontWeight:500,display:"flex",alignItems:"center",gap:4}}><Users size={12}/>{s.qn>0?`${s.qn} viat. · fila ${s.queue}`:"sem fila"}</span>
              <span style={{fontSize:10,color:T.gray4,display:"flex",alignItems:"center",gap:3}}><Clock size={10}/>{s.upd}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <FuelChips fuels={s.fuels} small/>
              <Stars rating={s.rating}/>
            </div>
          </button>
        ))}
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"48px 16px",color:T.gray4}}>
            <Fuel size={32} color={T.gray3} style={{display:"block",margin:"0 auto 12px"}}/>
            <div style={{fontSize:14,fontWeight:500,color:T.gray5,marginBottom:4}}>Nenhuma bomba encontrada</div>
            <div style={{fontSize:12}}>Tenta ajustar o filtro ou a pesquisa</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREÇOS TAB
// ─────────────────────────────────────────────────────────────────────────────
function PrecosTab({stations}){
  const avail=(k)=>stations.filter(s=>s.fuels[k]).length;
  return (
    <div>
      <div style={{background:"#fff7e6",border:`1px solid ${T.amberBd}`,borderRadius:12,padding:"11px 14px",marginBottom:14,fontSize:12,color:"#92400e",display:"flex",gap:8,alignItems:"flex-start"}}>
        <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>
        Tabela oficial do Governo de Moçambique (ARENE/MIREME). Preços actualizados mensalmente. Verifique sempre em <strong>mireme.gov.mz</strong>
      </div>
      <div style={{...card(),overflow:"hidden",marginBottom:12}}>
        <div style={{background:T.gray1,padding:"10px 16px",display:"grid",gridTemplateColumns:"1fr auto auto",gap:8}}>
          <span style={{fontSize:11,fontWeight:600,color:T.gray4}}>Combustível</span>
          <span style={{fontSize:11,fontWeight:600,color:T.gray4,textAlign:"right"}}>Preço oficial</span>
          <span style={{fontSize:11,fontWeight:600,color:T.gray4,textAlign:"center",minWidth:52}}>Stock</span>
        </div>
        {FUEL_TYPES.map((f,i)=>(
          <div key={f.key} style={{padding:"13px 16px",borderTop:`1px solid ${T.gray2}`,display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:f.color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Dot color={f.color} size={12}/></div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.dark}}>{f.label}</div>
                <div style={{fontSize:10,color:T.gray4}}>{f.unit}</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:700,color:T.dark}}>{f.price.toLocaleString("pt",{minimumFractionDigits:2})}</div>
              <div style={{fontSize:10,color:T.gray4}}>MZN</div>
            </div>
            <div style={{textAlign:"center"}}>
              <span style={{fontSize:12,fontWeight:600,padding:"3px 8px",borderRadius:20,background:avail(f.key)>0?T.greenLt:T.redLt,color:avail(f.key)>0?T.green:T.red}}>{avail(f.key)}</span>
              <div style={{fontSize:9,color:T.gray4,marginTop:1}}>bombas</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{...card(),padding:"12px 16px",fontSize:12,color:T.gray4,lineHeight:1.7}}>
        <strong style={{color:T.dark,fontWeight:600}}>Fontes:</strong> Autoridade Reguladora de Energia (ARENE), Ministério dos Recursos Minerais e Energia (MIREME), Conselho de Ministros. Os preços são fixados por despacho ministerial e não podem ser praticados acima dos valores oficiais.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEWS TAB (AI)
// ─────────────────────────────────────────────────────────────────────────────
function NoticiasTab({city}){
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);
  const CAT={governo:{bg:"#eff6ff",c:"#1d4ed8"},abastecimento:{bg:T.greenLt,c:"#15803d"},preços:{bg:T.amberLt,c:"#92400e"},internacional:{bg:"#faf5ff",c:T.purple},alerta:{bg:T.redLt,c:T.red},infraestrutura:{bg:"#fff7ed",c:"#9a3412"}};

  const load=async()=>{
    setLoading(true);setErr(null);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1400,messages:[{role:"user",
          content:`Cria 6 notícias jornalísticas realistas sobre a crise de combustível em Moçambique (${city}) em Abril 2025.
Foca em: reservas estratégicas, importações, impacto económico, medidas do governo, infraestrutura portuária, preços internacionais.
Usa fontes reais: AIM, Rádio Moçambique, Notícias, Canal de Moçambique, Governo.gov.mz, CMC, Lusa, VOA Português.
Inclui dados concretos (%, volumes, valores em USD/MZN, regiões específicas).
JSON array sem markdown:
[{"titulo":"...","fonte":"...","resumo":"...","data":"...","categoria":"governo|abastecimento|preços|internacional|alerta|infraestrutura","urgente":true|false}]`
        }]})});
      const d=await r.json();
      setNews(JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim()));
    }catch{setErr("Não foi possível carregar. Tente novamente.");}
    setLoading(false);
  };

  useEffect(()=>{load();},[city]);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:12,color:T.gray4}}>Monitorização automática de fontes oficiais e media</div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,padding:"6px 12px",borderRadius:20,border:`1px solid ${T.gray3}`,background:"white",cursor:"pointer",color:T.gray5}}><RefreshCw size={11}/>Atualizar</button>
      </div>
      {loading&&<Spinner/>}
      {err&&<div style={{padding:12,borderRadius:10,background:T.redLt,color:T.red,fontSize:13,textAlign:"center"}}>{err}</div>}
      {!loading&&news.map((n,i)=>{
        const c=CAT[n.categoria]||CAT.governo;
        return(
          <div key={i} style={{...card(),padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={pill(c.bg,c.c)}>{n.categoria}</span>
                {n.urgente&&<span style={pill(T.redLt,T.red)}><Zap size={9}/>urgente</span>}
              </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// CHAT TAB (with votes)
// ─────────────────────────────────────────────────────────────────────────────
function ChatTab({user,onNeedAuth,stations}){
  const [msgs,setMsgs]=useState(MSGS0);
  const [input,setInput]=useState("");
  const [stFilter,setStFilter]=useState("todos");
  const bottomRef=useRef(null);
  const fileRef=useRef(null);
  const [imgPrev,setImgPrev]=useState(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const vote=(id,dir)=>{
    if(!user){onNeedAuth("Precisas de uma conta para votar nas mensagens.");return;}
    setMsgs(ms=>ms.map(m=>{
      if(m.id!==id)return m;
      const prev=m.voted;
      if(prev===dir)return {...m,voted:null,[dir]:m[dir]-1};
      const upd={...m,voted:dir,[dir]:m[dir]+1};
      if(prev)upd[prev]=m[prev]-1;
      return upd;
    }));
  };

  const send=()=>{
    if(!user){onNeedAuth("Para participar no chat precisas de uma conta FuelWatch.");return;}
    if(!input.trim()&&!imgPrev)return;
    const m={id:Date.now(),user:user.nome,role:user.tipo,time:new Date().toLocaleTimeString("pt",{hour:"2-digit",minute:"2-digit"}),msg:input,av:user.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),color:T.purple,up:0,dn:0,voted:null,sid:null,img:imgPrev};
    setMsgs(ms=>[...ms,m]);setInput("");setImgPrev(null);
  };

  const handleFile=(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    const r=new FileReader();r.onload=()=>setImgPrev(r.result);r.readAsDataURL(f);
  };

  const filtered=stFilter==="todos"?msgs:msgs.filter(m=>m.sid===Number(stFilter));

  return(
    <div>
      {/* Filter by station */}
      <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        <button onClick={()=>setStFilter("todos")} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1px solid ${stFilter==="todos"?T.amber:T.gray3}`,background:stFilter==="todos"?T.amberLt:"white",color:stFilter==="todos"?"#92400e":T.gray5,fontSize:11,cursor:"pointer",fontWeight:stFilter==="todos"?600:400}}>Todas</button>
        {stations.filter(s=>[...new Set(MSGS0.map(m=>m.sid))].includes(s.id)).map(s=>(
          <button key={s.id} onClick={()=>setStFilter(String(s.id))} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1px solid ${stFilter===String(s.id)?T.amber:T.gray3}`,background:stFilter===String(s.id)?T.amberLt:"white",color:stFilter===String(s.id)?"#92400e":T.gray5,fontSize:11,cursor:"pointer",fontWeight:stFilter===String(s.id)?600:400,whiteSpace:"nowrap"}}>{s.name.split(" ").slice(0,2).join(" ")}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{maxHeight:380,overflowY:"auto",marginBottom:12,paddingRight:2}}>
        {filtered.map(m=>{
          const rm=m.role==="proprietário"?{bg:"#faf5ff",c:T.purple}:m.role==="funcionário"?{bg:T.greenLt,c:"#059669"}:{bg:"#eff6ff",c:T.blue};
          return(
            <div key={m.id} style={{display:"flex",gap:10,marginBottom:14}}>
              <Av ini={m.av} color={m.color}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,fontSize:13,color:T.dark}}>{m.user}</span>
                  <span style={pill(rm.bg,rm.c,{fontSize:9})}>{m.role}</span>
                  {m.sid&&<span style={{fontSize:10,color:T.amber,fontWeight:500}}>⛽ {stations.find(s=>s.id===m.sid)?.name.split(" ").slice(0,2).join(" ")}</span>}
                  <span style={{fontSize:10,color:T.gray4,marginLeft:"auto"}}>{m.time}</span>
                </div>
                <div style={{background:T.gray1,borderRadius:"4px 12px 12px 12px",padding:"9px 12px",fontSize:13,color:T.dark,lineHeight:1.55,marginBottom:5}}>
                  {m.msg}
                  {m.img&&<img src={m.img} alt="" style={{display:"block",marginTop:7,maxWidth:"100%",borderRadius:8,border:`1px solid ${T.gray3}`}}/>}
                </div>
                {/* Votes */}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>vote(m.id,"up")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,border:`1px solid ${m.voted==="up"?T.green:T.gray3}`,background:m.voted==="up"?T.greenLt:"white",color:m.voted==="up"?T.green:T.gray4,fontSize:11,cursor:"pointer",fontWeight:m.voted==="up"?600:400}}>
                    <ThumbsUp size={10}/>{m.up}
                  </button>
                  <button onClick={()=>vote(m.id,"dn")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:20,border:`1px solid ${m.voted==="dn"?T.red:T.gray3}`,background:m.voted==="dn"?T.redLt:"white",color:m.voted==="dn"?T.red:T.gray4,fontSize:11,cursor:"pointer",fontWeight:m.voted==="dn"?600:400}}>
                    <ThumbsDown size={10}/>{m.dn}
                  </button>
                  {m.up-m.dn>=10&&<span style={{fontSize:10,color:T.green,display:"flex",alignItems:"center",gap:2}}><Award size={10}/>Top info</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      {!user&&(
        <div style={{background:T.gray2,borderRadius:14,padding:"14px 16px",textAlign:"center",marginBottom:8}}>
          <Lock size={16} color={T.gray4} style={{display:"block",margin:"0 auto 6px"}}/>
          <div style={{fontSize:13,color:T.gray5,marginBottom:8}}>É necessário ter uma conta para comentar</div>
          <button onClick={()=>onNeedAuth("Para participar no chat precisas de uma conta FuelWatch.")} style={{padding:"9px 20px",borderRadius:20,border:"none",background:T.amber,color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>Criar conta ou entrar</button>
        </div>
      )}
      {user&&(
        <div>
          {imgPrev&&(
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <img src={imgPrev} alt="" style={{height:44,borderRadius:8,border:`1px solid ${T.gray3}`}}/>
              <button onClick={()=>setImgPrev(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.gray4,fontSize:12}}>remover</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>fileRef.current?.click()} style={{width:40,height:40,borderRadius:12,border:`1px solid ${T.gray3}`,background:"white",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:T.gray4,fontSize:17}}>📷</button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Partilha informações úteis sobre combustível..." style={{flex:1,padding:"10px 14px",borderRadius:22,border:`1px solid ${T.gray3}`,fontSize:13,background:"white",color:T.dark,outline:"none"}}/>
            <button onClick={send} disabled={!input.trim()&&!imgPrev} style={{width:40,height:40,borderRadius:"50%",border:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:input.trim()||imgPrev?T.amber:T.gray2,color:input.trim()||imgPrev?"white":T.gray4,cursor:input.trim()||imgPrev?"pointer":"not-allowed"}}><Send size={15}/></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB (owner / employee only)
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab({user,stations}){
  const myStation=stations.find(s=>s.name.toLowerCase().includes((user?.bomba||"").toLowerCase().split(" ")[0])||s.id===2);
  const [stock,setStock]=useState(myStation?{...myStation.fuels}:{g87:true,g95:false,diesel:true,petro:false,gpl:true});
  const [queue,setQueue]=useState(myStation?.queue||"baixa");
  const [saved,setSaved]=useState(false);

  const today24h=useMemo(()=>Array.from({length:24},(_,i)=>({h:`${String(i).padStart(2,"0")}h`,reports:Math.floor(Math.random()*8)})),[]);
  const totalReports=today24h.reduce((a,b)=>a+b.reports,0);

  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);};

  return(
    <div>
      <div style={{background:"linear-gradient(135deg,#1a1714,#3a2e26)",borderRadius:16,padding:"18px 18px",marginBottom:16,color:"white"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:2}}>A gerir</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:4}}>{myStation?.name||"A minha bomba"}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:12}}>{myStation?.addr}</div>
        <div style={{display:"flex",gap:12}}>
          {[["Confirmações hoje",totalReports,"📋"],["Avaliação",myStation?.rating?.toFixed(1)||"—","⭐"],["Fila actual",myStation?.qn||0,"🚗"]].map(([l,v,ic])=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:2}}>{ic}</div>
              <div style={{fontWeight:700,fontSize:16,color:"white"}}>{v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.5)",lineHeight:1.3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock management */}
      <div style={{...card(),padding:"14px 16px",marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:12}}>Gerir disponibilidade de stock</div>
        <div style={{display:"grid",gap:8,marginBottom:14}}>
          {FUEL_TYPES.map(f=>(
            <div key={f.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:10,background:stock[f.key]?f.color+"10":T.gray1,border:`1px solid ${stock[f.key]?f.color+"33":T.gray3}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Dot color={stock[f.key]?f.color:T.gray3} size={10}/>
                <span style={{fontSize:13,fontWeight:500,color:T.dark}}>{f.label}</span>
              </div>
              <button onClick={()=>setStock({...stock,[f.key]:!stock[f.key]})} style={{padding:"5px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:stock[f.key]?T.green:T.red,color:"white"}}>{stock[f.key]?"Disponível":"Esgotado"}</button>
            </div>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:500,color:T.gray5,marginBottom:7}}>Intensidade da fila agora</div>
          <div style={{display:"flex",gap:7}}>
            {[["baixa",T.green],["média",T.amber],["alta",T.red]].map(([q,c])=>(
              <button key={q} onClick={()=>setQueue(q)} style={{flex:1,padding:"9px",borderRadius:10,border:`1.5px solid ${queue===q?c:T.gray3}`,background:queue===q?c+"18":"white",color:queue===q?c:T.gray4,fontSize:12,cursor:"pointer",fontWeight:queue===q?600:400}}>{q}</button>
            ))}
          </div>
        </div>
        <button onClick={save} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:saved?T.green:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background .3s"}}>
          {saved?<><Check size={15}/>Guardado!</>:<><Activity size={15}/>Actualizar estado agora</>}
        </button>
      </div>

      {/* Reports chart */}
      <div style={{...card(),padding:"14px 16px",marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:12}}>Confirmações da comunidade (hoje)</div>
        <div style={{height:100}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={today24h} margin={{top:0,right:0,bottom:0,left:-20}}>
              <XAxis dataKey="h" tick={{fontSize:8,fill:T.gray4}} interval={3} tickLine={false} axisLine={false}/>
              <YAxis tick={{fontSize:8,fill:T.gray4}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{background:"white",border:`1px solid ${T.gray3}`,borderRadius:8,fontSize:11}} formatter={v=>[v,"confirmações"]}/>
              <Bar dataKey="reports" radius={[4,4,0,0]}>
                {today24h.map((_,i)=><Cell key={i} fill={T.amber}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{fontSize:12,color:T.gray4,textAlign:"center",marginTop:6}}>{totalReports} confirmações recebidas hoje</div>
      </div>

      {/* Alerts */}
      <div style={{...card(),padding:"12px 16px"}}>
        <div style={{fontWeight:600,fontSize:13,color:T.dark,marginBottom:10}}>Alertas activos</div>
        {[
          {type:"warning",msg:"Fila a aumentar — 45 viaturas reportadas há 8 min"},
          {type:"info",msg:"3 novos comentários sobre a tua bomba no chat"},
          {type:"success",msg:"A tua última actualização de stock foi vista por 127 pessoas"},
        ].map((a,i)=>{
          const mc={warning:{bg:T.amberLt,c:"#92400e",ic:<AlertTriangle size={13}/>},info:{bg:"#eff6ff",c:T.blue,ic:<Bell size={13}/>},success:{bg:T.greenLt,c:T.green,ic:<CheckCircle size={13}/>}}[a.type];
          return(
            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",borderRadius:8,background:mc.bg,marginBottom:i<2?7:0}}>
              <span style={{color:mc.c,marginTop:1,flexShrink:0}}>{mc.ic}</span>
              <span style={{fontSize:12,color:mc.c,lineHeight:1.5}}>{a.msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT TAB
// ─────────────────────────────────────────────────────────────────────────────
function ContaTab({user,onNeedAuth,onLogout}){
  const [notifs,setNotifs]=useState({crise:true,reabertura:true,precos:false,chat:true});
  if(!user)return(
    <div style={{textAlign:"center",paddingTop:32}}>
      <div style={{width:64,height:64,borderRadius:20,background:T.amberLt,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={28} color={T.amber}/></div>
      <div style={{fontWeight:700,fontSize:18,color:T.dark,marginBottom:6}}>A tua conta FuelWatch</div>
      <div style={{fontSize:13,color:T.gray4,marginBottom:24,lineHeight:1.6,maxWidth:280,margin:"0 auto 24px"}}>Com uma conta podes confirmar abastecimentos, comentar no chat e receber alertas de crise.</div>
      <button onClick={()=>onNeedAuth()} style={{padding:"13px 32px",borderRadius:14,border:"none",background:T.amber,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:10,display:"block",margin:"0 auto 10px"}}>Criar conta gratuita</button>
      <button onClick={()=>onNeedAuth()} style={{padding:"11px 32px",borderRadius:14,border:`1px solid ${T.gray3}`,background:"white",color:T.gray5,fontSize:13,cursor:"pointer",display:"block",margin:"0 auto"}}>Já tenho conta — entrar</button>
    </div>
  );

  const ROLE_INFO={proprietário:"Gerencia a disponibilidade de combustíveis na tua bomba, recebe alertas e comunica proactivamente.",funcionário:"Actualiza o estado de stock em tempo real e responde à comunidade.",cliente:"Confirma abastecimentos e ajuda outros utilizadores com informações de filas."};

  return(
    <div>
      {/* Profile card */}
      <div style={{background:"linear-gradient(135deg,#1a1714,#3a2e26)",borderRadius:20,padding:"20px 20px",marginBottom:14,color:"white"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:54,height:54,borderRadius:"50%",background:"rgba(232,147,10,.25)",color:T.amber,fontWeight:700,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{user.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
          <div>
            <div style={{fontWeight:700,fontSize:17}}>{user.nome}</div>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.7)"}}>{user.tipo}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          {[["0","Relatórios"],["0","Votos úteis"],["0 pts","Pontos"]].map(([v,l])=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,.07)",borderRadius:10,padding:"8px",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:15,color:"white"}}>{v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.45)"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div style={{...card(),padding:"12px 16px",marginBottom:12}}>
        {[["Email",user.email],["Telefone",user.tel||"+258 —"],user.bomba?["Bomba afiliada",user.bomba]:null].filter(Boolean).map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.gray2}`}}>
            <span style={{fontSize:12,color:T.gray4}}>{k}</span>
            <span style={{fontSize:12,fontWeight:500,color:T.dark}}>{v}</span>
          </div>
        ))}
        <div style={{padding:"8px 0",fontSize:12,color:T.gray4,lineHeight:1.6}}>
          {ROLE_INFO[user.tipo]}
        </div>
      </div>

      {/* Notifications */}
      <div style={{...card(),padding:"14px 16px",marginBottom:12}}>
        <div style={{fontWeight:600,fontSize:14,color:T.dark,marginBottom:12}}>Notificações</div>
        {[["crise","Alertas de crise (stock generalizado < 30%)"],["reabertura","Bomba sem stock reabriu perto de mim"],["precos","Actualização de preços oficiais"],["chat","Resposta às minhas mensagens no chat"]].map(([k,l])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:13,color:T.gray5,flex:1,paddingRight:12}}>{l}</span>
            <div onClick={()=>setNotifs(n=>({...n,[k]:!n[k]}))} style={{width:40,height:22,borderRadius:22,background:notifs[k]?T.amber:T.gray2,border:`1px solid ${notifs[k]?T.amberBd:T.gray3}`,position:"relative",cursor:"pointer",transition:"background .2s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:2,left:notifs[k]?20:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}/>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid #fecaca`,background:T.redLt,color:T.red,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        <LogOut size={14}/> Terminar sessão
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRISIS BANNER
// ─────────────────────────────────────────────────────────────────────────────
function CrisisBanner({stations}){
  const empty=stations.filter(s=>s.status==="sem stock").length;
  const pct=Math.round((empty/stations.length)*100);
  const [dismissed,setDismissed]=useState(false);
  if(pct<25||dismissed)return null;
  const severe=pct>=50;
  return(
    <div style={{background:severe?"#7f1d1d":T.amberLt,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${severe?"#991b1b":T.amberBd}`}}>
      <div style={{width:32,height:32,borderRadius:10,background:severe?"rgba(255,255,255,.12)":T.amberBd,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Zap size={16} color={severe?"white":T.amber}/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,fontSize:13,color:severe?"white":"#92400e"}}>{severe?"Crise severa de combustível":"Escassez de combustível detectada"}</div>
        <div style={{fontSize:11,color:severe?"rgba(255,255,255,.7)":"#b45309"}}>{pct}% das bombas sem stock · {empty} de {stations.length} bombas afectadas</div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"none",border:"none",cursor:"pointer",color:severe?"rgba(255,255,255,.5)":"#b45309",flexShrink:0,padding:4}}><X size={15}/></button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function NotifPanel({onClose}){
  const notifs=[
    {id:1,ic:"⛽",title:"Total Aeroporto voltou a ter G87",body:"Há 5 min · 3 confirmações",unread:true},
    {id:2,ic:"⚠️",title:"Puma Baixa continua sem stock",body:"Há 1 hora · 27 confirmações",unread:true},
    {id:3,ic:"📢",title:"Governo anuncia chegada de cargueiro",body:"Há 2 horas · AIM",unread:false},
    {id:4,ic:"💬",title:"Nova resposta ao teu comentário",body:"Há 3 horas",unread:false},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,.5)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",zIndex:200,paddingTop:56}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"white",borderRadius:"0 0 0 16px",width:280,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,.15)"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.gray2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:14,color:T.dark}}>Notificações</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.gray4}}><X size={15}/></button>
        </div>
        {notifs.map(n=>(
          <div key={n.id} style={{padding:"12px 16px",borderBottom:`1px solid ${T.gray2}`,background:n.unread?T.amberLt:"white",display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{fontSize:20,flexShrink:0,lineHeight:1}}>{n.ic}</div>
            <div>
              <div style={{fontSize:13,fontWeight:n.unread?600:400,color:T.dark,marginBottom:2}}>{n.title}</div>
              <div style={{fontSize:11,color:T.gray4}}>{n.body}</div>
            </div>
            {n.unread&&<div style={{width:7,height:7,borderRadius:"50%",background:T.amber,flexShrink:0,marginTop:4}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({msg}){
  return(
    <div style={{position:"fixed",top:68,left:"50%",transform:"translateX(-50%)",background:T.dark,color:"white",padding:"10px 18px",borderRadius:24,fontSize:13,fontWeight:500,zIndex:400,whiteSpace:"nowrap",pointerEvents:"none"}}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("mapa");
  const [city,setCity]=useState("Maputo");
  const [user,setUser]=useState(null);
  const [selStation,setSelStation]=useState(null);
  const [reportStation,setReportStation]=useState(null);
  const [authReason,setAuthReason]=useState(null);
  const [showNotifs,setShowNotifs]=useState(false);
  const [toast,setToast]=useState(null);
  const [unread]=useState(2);

  const stations=STATIONS.filter(s=>s.city===city);

  const showToast=(m)=>{setToast(m);setTimeout(()=>setToast(null),3000);};

  const needAuth=(reason="")=>{setAuthReason(reason||"Precisas de uma conta para continuar.");};
  const handleAuthSuccess=(u)=>{setUser(u);setAuthReason(null);showToast(`Bem-vindo(a), ${u.nome.split(" ")[0]}! 👋`);};
  const handleReport=(d)=>{setReportStation(null);setSelStation(null);showToast("✓ Abastecimento confirmado! Obrigado pela contribuição.");};
  const handleLogout=()=>{setUser(null);setTab("mapa");showToast("Sessão terminada.");};

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

  const avail=stations.filter(s=>s.status!=="sem stock").length;
  const empty=stations.filter(s=>s.status==="sem stock").length;

  return(
    <div style={{fontFamily:"-apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif",maxWidth:480,margin:"0 auto",background:T.gray1,minHeight:"100vh",paddingBottom:72,position:"relative"}}>

      {/* ── Header ── */}
      <div style={{background:"white",borderBottom:`1px solid ${T.gray3}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.amber,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Fuel size={17} color="white"/>
            </div>
            <div>
              <span style={{fontWeight:700,fontSize:16,color:T.dark,letterSpacing:-.3}}>FuelWatch</span>
              <span style={{marginLeft:6,fontSize:9,background:T.greenLt,color:T.green,padding:"1px 6px",borderRadius:20,fontWeight:600}}>AO VIVO</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <select value={city} onChange={e=>{setCity(e.target.value);}} style={{fontSize:12,padding:"5px 8px",borderRadius:9,border:`1px solid ${T.gray3}`,background:"white",color:T.dark,cursor:"pointer",fontWeight:500}}>
              {CITIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <button onClick={()=>setShowNotifs(!showNotifs)} style={{width:36,height:36,borderRadius:11,border:`1px solid ${T.gray3}`,background:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",color:T.gray5}}>
              <Bell size={16}/>
              {unread>0&&<span style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:T.red,border:"2px solid white"}}/>}
            </button>
            {user
              ?<Av ini={user.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()} color={T.amber} size={34}/>
              :<button onClick={()=>needAuth()} style={{padding:"7px 12px",borderRadius:20,border:"none",background:T.amber,color:"white",fontSize:12,fontWeight:600,cursor:"pointer"}}>Entrar</button>
            }
          </div>
        </div>

        {/* Stats + crisis indicator */}
        <div style={{padding:"0 14px 10px",display:"flex",gap:7,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:T.greenLt,color:T.green}}>{avail} com stock</span>
          <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:T.redLt,color:T.red}}>{empty} sem stock</span>
          <span style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:T.gray2,color:T.gray5}}>{stations.length} bombas</span>
          <span style={{marginLeft:"auto",fontSize:10,color:T.gray4,display:"flex",alignItems:"center",gap:3}}><Radio size={9}/>{new Date().toLocaleTimeString("pt",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>

        <CrisisBanner stations={stations}/>
      </div>

      {/* ── Page title ── */}
      <div style={{padding:"14px 14px 0"}}>
        <h2 style={{margin:"0 0 12px",fontWeight:700,fontSize:17,color:T.dark,letterSpacing:-.3}}>
          {{mapa:"Mapa de combustível",bombas:"Bombas de abastecimento",precos:"Preços oficiais",noticias:"Feed de notícias",chat:"Comunidade",dash:"O meu dashboard",conta:user?"A minha conta":"Entrar / Registar"}[tab]}
        </h2>
      </div>

      {/* ── Content ── */}
      <div style={{padding:"0 14px 16px"}}>
        {tab==="mapa"    &&<MapTab stations={stations} onSelectStation={setSelStation}/>}
        {tab==="bombas"  &&<BombasTab stations={stations} onSelectStation={setSelStation}/>}
        {tab==="precos"  &&<PrecosTab stations={stations}/>}
        {tab==="noticias"&&<NoticiasTab city={city}/>}
        {tab==="chat"    &&<ChatTab user={user} onNeedAuth={needAuth} stations={stations}/>}
        {tab==="dash"    &&hasDashboard&&<DashboardTab user={user} stations={stations}/>}
        {tab==="conta"   &&<ContaTab user={user} onNeedAuth={needAuth} onLogout={handleLogout}/>}
      </div>

      {/* ── Bottom Navigation ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"white",borderTop:`1px solid ${T.gray3}`,display:"flex",zIndex:90,boxSizing:"border-box"}}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 2px 10px",background:"none",border:"none",cursor:"pointer",color:tab===id?T.amber:T.gray4,position:"relative",minWidth:0}}>
            <Icon size={18}/>
            <span style={{fontSize:9,fontWeight:tab===id?700:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",paddingLeft:2,paddingRight:2}}>{label}</span>
            {tab===id&&<span style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:20,height:2,borderRadius:2,background:T.amber}}/>}
          </button>
        ))}
      </div>

      {/* ── Overlays ── */}
      {selStation&&<StationSheet s={selStation} onClose={()=>setSelStation(null)} onReport={setReportStation} user={user} onNeedAuth={needAuth}/>}
      {reportStation&&<ReportModal s={reportStation} onClose={()=>setReportStation(null)} onDone={handleReport}/>}
      {authReason!==null&&<AuthModal reason={authReason} onClose={()=>setAuthReason(null)} onSuccess={handleAuthSuccess}/>}
      {showNotifs&&<NotifPanel onClose={()=>setShowNotifs(false)}/>}
      {toast&&<Toast msg={toast}/>}

      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${T.gray3};border-radius:4px;}@keyframes spin{to{transform:rotate(360deg)}}input,textarea,select{font-family:inherit;}button{font-family:inherit;}`}</style>
    </div>
  );
}
