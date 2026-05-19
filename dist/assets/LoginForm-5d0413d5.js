import{c as o,u as v,r as n,j as e}from"./index-872ba26f.js";import{U as k}from"./user-94def5c2.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=o("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=o("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=o("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=o("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=o("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]),I="/assets/login-bg-91e4f6ba.png",t={bg0:"#060A10",card:"#0D1725",bd:"rgba(255,255,255,0.09)",bdFoc:"rgba(14,165,233,0.55)",tx1:"#F1F5F9",tx2:"#94A3B8",tx3:"#64748B",acc:"#0EA5E9",accH:"#0284C7",ok:"#10B981",err:"#F43F5E"},E=()=>{const{login:x,loading:a,error:s,clearError:p,loginAsAdmin:g,loginAsTrader:m}=v(),[i,h]=n.useState({username:"",password:""}),[l,b]=n.useState(!1),[d,y]=n.useState(new Date);n.useEffect(()=>{const r=setInterval(()=>y(new Date),1e3);return()=>clearInterval(r)},[]),n.useEffect(()=>{if(document.getElementById("__lf-css"))return;const r=document.createElement("style");r.id="__lf-css",r.textContent=`
      @keyframes __lf-spin { to { transform: rotate(360deg); } }
      @keyframes __lf-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

      .__lf-card { animation: __lf-fade 0.45s cubic-bezier(0.22,1,0.36,1) both; }

      .__lf-field {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .__lf-input {
        width: 100%; box-sizing: border-box;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 5px;
        padding: 10px 36px 10px 36px;
        color: ${t.tx1};
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.15s, background 0.15s;
        -webkit-appearance: none;
      }
      .__lf-input::placeholder { color: ${t.tx3}; }
      .__lf-input:hover { border-color: rgba(255,255,255,0.18); }
      .__lf-input:focus {
        border-color: ${t.acc};
        background: rgba(14,165,233,0.05);
      }

      .__lf-btn {
        width: 100%;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 12px 20px;
        background: ${t.acc};
        color: #fff;
        border: none; border-radius: 5px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.85rem; font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s, transform 0.10s;
        outline: none;
      }
      .__lf-btn:hover:not(:disabled) {
        background: ${t.accH};
        box-shadow: 0 4px 20px rgba(14,165,233,0.30);
      }
      .__lf-btn:active:not(:disabled) { transform: scale(0.985); }
      .__lf-btn:disabled {
        background: rgba(14,165,233,0.20);
        color: rgba(255,255,255,0.35);
        cursor: not-allowed;
      }

      .__lf-ghost {
        flex: 1; padding: 8px 10px;
        background: rgba(255,255,255,0.04);
        color: ${t.tx2};
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 4px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.75rem; font-weight: 500;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s, color 0.12s;
        outline: none;
      }
      .__lf-ghost:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.16);
        color: ${t.tx1};
      }

      .__lf-icon {
        position: absolute;
        top: 50%; transform: translateY(-50%);
        pointer-events: none;
        display: flex; align-items: center;
      }

      .__lf-eye {
        position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer;
        color: ${t.tx3}; display: flex; align-items: center; padding: 2px;
        transition: color 0.12s; outline: none;
      }
      .__lf-eye:hover { color: ${t.tx2}; }

      .__lf-label {
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 0.72rem; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        color: ${t.tx2};
        margin-bottom: 7px;
        display: block;
      }
    `,document.head.appendChild(r)},[]);const c=r=>{h(f=>({...f,[r.target.name]:r.target.value})),s&&p()},u=async r=>{r.preventDefault();try{await x(i.username,i.password)}catch{}},j=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),_=d.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});return e.jsxs("div",{style:{minHeight:"100vh",background:t.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",padding:"24px 16px"},children:[e.jsx("div",{style:{position:"fixed",inset:0,zIndex:0,backgroundImage:`url(${I})`,backgroundSize:"cover",backgroundPosition:"center",filter:"brightness(0.30) saturate(0.60)",transform:"scale(1.05)"}}),e.jsx("div",{style:{position:"fixed",inset:0,zIndex:1,background:"rgba(6,10,16,0.72)"}}),e.jsxs("div",{className:"__lf-card",style:{position:"relative",zIndex:10,width:"100%",maxWidth:400,background:t.card,borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",borderTop:`2px solid ${t.acc}`,padding:"36px 36px 30px",boxShadow:"0 32px 80px rgba(0,0,0,0.65), 0 4px 24px rgba(14,165,233,0.08)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:30,paddingBottom:20,borderBottom:"1px solid rgba(255,255,255,0.07)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:11},children:[e.jsx("img",{src:"/attijariwafa-logo.png",alt:"AWB",style:{height:24,width:"auto",objectFit:"contain"}}),e.jsx("div",{style:{width:1,height:18,background:"rgba(255,255,255,0.12)",flexShrink:0}}),e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"var(--f-disp)",fontSize:"0.60rem",fontWeight:700,letterSpacing:"0.13em",textTransform:"uppercase",color:"rgba(255,255,255,0.80)"},children:"Fixed Income"}),e.jsx("div",{style:{fontFamily:"var(--f-disp)",fontSize:"0.52rem",fontWeight:500,letterSpacing:"0.10em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)",marginTop:1},children:"Desk International"})]})]}),e.jsxs("div",{style:{textAlign:"right"},children:[e.jsx("div",{style:{fontFamily:"var(--f-mono)",fontSize:"0.85rem",fontWeight:700,color:t.tx1,letterSpacing:"0.04em",lineHeight:1},children:j}),e.jsx("div",{style:{fontFamily:"var(--f-mono)",fontSize:"0.57rem",color:t.tx3,marginTop:4,letterSpacing:"0.02em"},children:_})]})]}),e.jsxs("div",{style:{marginBottom:24},children:[e.jsx("h1",{style:{fontFamily:"var(--f-disp)",fontWeight:700,fontSize:"1.40rem",color:t.tx1,letterSpacing:"-0.02em",lineHeight:1.2,margin:0,marginBottom:6},children:"Connexion"}),e.jsx("p",{style:{fontFamily:"var(--f-body)",fontSize:"0.78rem",color:t.tx2,margin:0,lineHeight:1.5},children:"Accès réservé aux utilisateurs autorisés"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"7px 11px",background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.18)",borderRadius:4,marginBottom:24},children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:t.ok,flexShrink:0,boxShadow:`0 0 6px ${t.ok}`}}),e.jsx("span",{style:{fontFamily:"var(--f-mono)",fontSize:"0.60rem",color:"rgba(16,185,129,0.85)",letterSpacing:"0.06em",fontWeight:600},children:"SYSTÈME OPÉRATIONNEL"}),e.jsx("span",{style:{marginLeft:"auto",fontFamily:"var(--f-mono)",fontSize:"0.57rem",color:t.tx3,fontWeight:500},children:"v2.1.0"})]}),s&&e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:9,padding:"10px 12px",borderRadius:4,marginBottom:18,background:"rgba(244,63,94,0.08)",border:"1px solid rgba(244,63,94,0.25)"},children:[e.jsx(w,{size:13,style:{color:t.err,flexShrink:0,marginTop:1}}),e.jsx("span",{style:{fontFamily:"var(--f-body)",fontSize:"0.78rem",color:"#FCA5A5",lineHeight:1.45},children:s})]}),e.jsxs("form",{onSubmit:u,style:{display:"flex",flexDirection:"column",gap:20},children:[e.jsxs("div",{children:[e.jsx("label",{className:"__lf-label",children:"Identifiant"}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx("span",{className:"__lf-icon",style:{left:11,color:t.tx3},children:e.jsx(k,{size:13})}),e.jsx("input",{className:"__lf-input",name:"username",value:i.username,onChange:c,placeholder:"nom.prenom",autoComplete:"username",required:!0})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"__lf-label",children:"Mot de passe"}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx("span",{className:"__lf-icon",style:{left:11,color:t.tx3},children:e.jsx(A,{size:13})}),e.jsx("input",{className:"__lf-input",name:"password",type:l?"text":"password",value:i.password,onChange:c,placeholder:"••••••••",autoComplete:"current-password",required:!0}),e.jsx("button",{type:"button",className:"__lf-eye",onClick:()=>b(r=>!r),tabIndex:-1,children:l?e.jsx(z,{size:14}):e.jsx(F,{size:14})})]})]}),e.jsx("button",{type:"submit",disabled:a,className:"__lf-btn",style:{marginTop:4},children:a?e.jsxs(e.Fragment,{children:[e.jsx("span",{style:{width:13,height:13,flexShrink:0,border:"2px solid rgba(255,255,255,0.20)",borderTopColor:"#fff",borderRadius:"50%",animation:"__lf-spin 0.75s linear infinite"}}),"Authentification en cours…"]}):e.jsxs(e.Fragment,{children:["Se connecter ",e.jsx(S,{size:14})]})})]}),e.jsxs("div",{style:{marginTop:24},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10},children:[e.jsx("div",{style:{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}),e.jsx("span",{style:{fontFamily:"var(--f-mono)",fontSize:"0.54rem",color:t.tx3,letterSpacing:"0.10em",textTransform:"uppercase"},children:"Accès rapide"}),e.jsx("div",{style:{flex:1,height:1,background:"rgba(255,255,255,0.07)"}})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("button",{onClick:m,className:"__lf-ghost",children:"Trader"}),e.jsx("button",{onClick:g,className:"__lf-ghost",children:"Admin"})]})]})]}),e.jsxs("div",{style:{position:"relative",zIndex:10,marginTop:24,display:"flex",gap:16,alignItems:"center"},children:[e.jsx("span",{style:{fontFamily:"var(--f-mono)",fontSize:"0.56rem",color:t.tx3,letterSpacing:"0.02em"},children:"© 2025 Attijariwafa Bank · Usage interne · Confidentiel"}),e.jsx("span",{style:{width:1,height:10,background:"rgba(255,255,255,0.15)"}}),e.jsx("span",{style:{fontFamily:"var(--f-mono)",fontSize:"0.56rem",color:t.tx3,letterSpacing:"0.02em"},children:"TLS 1.3 · SOC 2"})]})]})};export{E as default};
//# sourceMappingURL=LoginForm-5d0413d5.js.map
