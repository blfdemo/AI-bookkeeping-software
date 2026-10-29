/* Penny: in-app AI agent + real automation engine + PDF maker. Static, no backend. */
(()=>{
"use strict";
const KEY="ledger.state.v2",pad=n=>String(n).padStart(2,"0"),DAY=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],MN=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,hm=t=>t.split(":").map(Number);
const t12=at=>{const[h,m]=hm(at);return`${h%12||12}:${pad(m)} ${h<12?"AM":"PM"}`};
const fdt=ts=>new Date(ts).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
const tnow=()=>new Date().toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
const ago=ts=>{if(!ts)return"never";const m=Math.round((Date.now()-ts)/6e4);if(m<1)return"just now";if(m<60)return m+" min ago";return new Date(ts).toDateString()==new Date().toDateString()?"today, "+new Date(ts).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):fdt(ts)};
const kb=n=>n>1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";

/* ---------- schedule maths ---------- */
function next(s,from=Date.now()){
 if(!s)return null;if(s.f=="once")return s.ts>from?s.ts:null;if(s.f=="min")return from+s.every*6e4;
 const f=new Date(from),[h,m]=hm(s.at||"09:00");
 for(let i=0;i<=62;i++){const d=new Date(f.getFullYear(),f.getMonth(),f.getDate()+i,h,m,0,0);if(+d<=from)continue;
  if(s.f=="daily")return+d;if(s.f=="weekly"&&s.days.includes(d.getDay()))return+d;
  if(s.f=="monthly"&&d.getDate()==Math.min(s.dom,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))return+d}
 return null}
function schLabel(s){if(!s)return"When a receipt is uploaded";
 if(s.f=="once")return"Once, "+fdt(s.ts);if(s.f=="min")return s.every%60==0&&s.every>=60?`Every ${s.every/60} hour${s.every>60?"s":""}`:`Every ${s.every} minute${s.every>1?"s":""}`;
 if(s.f=="daily")return"Every day at "+t12(s.at);if(s.f=="weekly")return`Every ${s.days.map(d=>DAY[d]).join(", ")} at ${t12(s.at)}`;
 return`Monthly on day ${s.dom} at ${t12(s.at)}`}
function parseWhen(raw){const t=raw.toLowerCase(),now=Date.now(),b=new Date();let at=null;
 const tm=t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)||t.match(/\b(\d{1,2}):(\d{2})()\b/);
 if(tm){let h=+tm[1];const mi=+(tm[2]||0);if(tm[3]=="pm"&&h<12)h+=12;if(tm[3]=="am"&&h==12)h=0;if(h<24&&mi<60)at=pad(h)+":"+pad(mi)}
 else if(/morning/.test(t))at="09:00";else if(/afternoon/.test(t))at="15:00";else if(/evening/.test(t))at="18:00";else if(/\bnight\b|tonight/.test(t))at="21:00";
 let r=t.match(/\bin\s+(\d+|an?)\s*(sec|min|hour|hr|day|week)/);
 if(r){const n=/^a/.test(r[1])?1:+r[1];return{f:"once",ts:now+n*{sec:1e3,min:6e4,hou:36e5,hr:36e5,day:864e5,wee:6048e5}[r[2].slice(0,3)]}}
 const e=t.match(/\bevery\s+(\d+)?\s*(min|hour|hr)/);if(e){const n=+(e[1]||1);return{f:"min",every:/^h/.test(e[2])?n*60:n}}
 const wr=[/\bsun(day)?s?\b/,/\bmon(day)?s?\b/,/\btue(s|sday)?s?\b/,/\bwed(nesday)?s?\b/,/\bthu(r|rs|rsday)?s?\b/,/\bfri(day)?s?\b/,/\bsat(urday)?s?\b/],
  days=wr.map((x,i)=>x.test(t)?i:-1).filter(i=>i>=0);
 if(/\b(every|each|daily|weekly|monthly)\b/.test(t)){
  if(days.length)return{f:"weekly",days,at:at||"09:00"};
  if(/month/.test(t)){const d=t.match(/\b(\d{1,2})(st|nd|rd|th)\b/);return{f:"monthly",dom:d?Math.min(31,+d[1]):1,at:at||"09:00"}}
  if(/week/.test(t))return{f:"weekly",days:[1],at:at||"09:00"};
  return{f:"daily",at:at||"09:00"}}
 const mk=(d,ex)=>{const[h,mi]=hm(at||"09:00");let ts=+new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,mi);
  if(ts<=now){if(!ex)ts+=864e5;else if(!at)ts=now+6e4;else return null}return{f:"once",ts}};
 if(/tomorrow/.test(t))return mk(new Date(b.getFullYear(),b.getMonth(),b.getDate()+1),1);
 if(/\btoday\b|tonight/.test(t))return mk(b,1);
 const iso_=t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(iso_)return mk(new Date(+iso_[1],+iso_[2]-1,+iso_[3]),1);
 const mn=MN.join("|"),m1=t.match(new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*("+mn+")[a-z]*")),m2=t.match(new RegExp("\\b("+mn+")[a-z]*\\s*(\\d{1,2})\\b"));
 if(m1||m2){const dd=m1?+m1[1]:+m2[2],mo=MN.indexOf(m1?m1[2]:m2[1]);let d=new Date(b.getFullYear(),mo,dd);if(+d<now-864e5)d=new Date(b.getFullYear()+1,mo,dd);return mk(d,1)}
 if(days.length){for(let i=0;i<8;i++){const d=new Date(b.getFullYear(),b.getMonth(),b.getDate()+i);if(d.getDay()==days[0]){const x=mk(d,1);if(x&&x.ts>now)return x}}}
 if(at)return mk(b,0);return null}

/* ---------- parsing helpers ---------- */
function parseNum(s){s=String(s).toLowerCase().replace(/[₹,\s]|rs\.?|inr/g,"");const m=s.match(/^(\d+(?:\.\d+)?)(k|l|lakhs?|cr)?$/);if(!m)return null;return Math.round(+m[1]*({k:1e3,l:1e5,lakh:1e5,lakhs:1e5,cr:1e7}[m[2]]||1))}
function amt(t){t=t.replace(/\b(inv|bill)[- ]?\d+/ig,"").replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/ig,"").replace(/\b\d{1,2}:\d{2}\b/g,"").replace(/\b\d+\s*(st|nd|rd|th|min|minutes?|hours?|hrs?|days?|weeks?)\b/ig,"").replace(/\d+%/g,"");
 const m=t.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|cr)?|\b(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|cr)\b|\b(\d{1,3}(?:,\d{2,3})+|\d{4,})\b/i);
 return m?parseNum((m[1]||m[3]||m[5])+(m[2]||m[4]||"")):0}
const findName=(arr,s)=>{const x=arr.find(o=>{const n=o.c.toLowerCase(),f=n.split(" ")[0];return s.includes(n)||(f.length>3&&new RegExp("\\b"+f+"\\b").test(s))});return x&&x.c};
function matchOpt(o,t){const s=t.toLowerCase().trim();if(!s)return null;let m=o.find(x=>String(x[1]).toLowerCase()==s||x[0].toLowerCase()==s);if(m)return String(m[1]);
 if(/^\d+$/.test(s)&&+s>=1&&+s<=o.length&&o.length<12)return String(o[+s-1][1]);
 const c=o.filter(x=>x[0].toLowerCase().includes(s)||s.includes(String(x[1]).toLowerCase()));return c.length==1?String(c[0][1]):null}

/* ---------- state: save / load / seed ---------- */
const SEED=[["chase",{},{f:"daily",at:"09:00"}],["categorise",{mode:"90"},{f:"daily",at:"08:00"}],["none",{},null],["createinv",{c:"Lumen Studio",a:85000},{f:"monthly",dom:1,at:"09:00"}],["approve",{max:50000},{f:"daily",at:"10:00"}],["paybills",{},{f:"daily",at:"11:00"}],["report",{rep:"Profit and loss"},{f:"weekly",days:[1],at:"09:00"}],["remind",{msg:"Review the GSTR-3B draft before the 20th"},{f:"monthly",dom:18,at:"09:00"}]];
S.auto.forEach((a,i)=>{const s=SEED[i];if(s&&!a.k){a.k=s[0];a.p=s[1];a.sch=s[2];a.lt=0}});S.auto[4].n="Approve bills under ₹50,000";S.nt=[];
function save(){try{S.acct[0][3]=CASH;localStorage[KEY]=JSON.stringify({S,CASH})}catch(e){}}
try{const d=JSON.parse(localStorage[KEY]);if(d&&d.S){Object.keys(d.S).forEach(k=>S[k]=d.S[k]);CASH=d.CASH}}catch(e){}
S.auto.forEach(a=>{if(a.on&&a.sch&&a.nx==null)a.nx=next(a.sch)});

/* ---------- actions (shared by automations and chat) ---------- */
const docOf=n=>S.inv.find(x=>x.n==n)||S.bill.find(x=>x.n==n),info=n=>{const o=docOf(n);return o?` (${o.c}, ${fmt(o.a)})`:""};
const invOpts=()=>S.inv.filter(o=>o.s!="Paid").map(o=>[`${o.n} · ${o.c} · ${fmt(o.a)}`,o.n]),billOpts=()=>S.bill.filter(o=>o.s!="Paid").map(o=>[`${o.n} · ${o.c} · ${fmt(o.a)}`,o.n]);
const REPS=[...Object.keys(R),"Invoice register","Bill register","Bank feed"],plural=(n,w)=>n+" "+w+(n==1?"":"s");
const nextNo=(arr,p)=>p+(Math.max(0,...arr.map(v=>+v.n.replace(/\D/g,"")))+1);
function notify(t,m,act,quiet){const n={id:Date.now()+""+Math.floor(Math.random()*99),t,m,at:tnow(),act};S.nt.unshift(n);S.nt.length=Math.min(S.nt.length,12);
 if(!quiet){banner(n);try{if(window.Notification&&Notification.permission=="granted")new Notification(t,{body:m})}catch(e){}}}
const A={
 remind:{n:"Remind me",nc:1,ps:[{k:"msg",l:"Reminder text",q:"What should I remind you about?",ty:"text"}],d:p=>`Remind you: “${p.msg}”`,run:p=>{notify("Reminder",p.msg);return"Reminder shown: "+p.msg}},
 chase:{n:"Chase overdue invoices",ps:[],d:()=>"Send reminders for every overdue invoice",run:()=>{const o=S.inv.filter(i=>i.s=="Overdue");o.forEach(i=>i.rm=(i.rm||0)+1);return o.length?`Reminder sent to ${[...new Set(o.map(i=>i.c))].join(", ")} for ${plural(o.length,"invoice")}`:"No overdue invoices to chase"}},
 approve:{n:"Approve bills",ps:[{k:"max",l:"Up to amount (₹)",ph:"Blank = any amount",q:"Approve bills up to what amount?",ty:"num",opt:1,ch:[["Any amount","any"],["Up to ₹50,000","50000"],["Up to ₹1,00,000","100000"]]}],
  d:p=>+p.max?`Approve open bills up to ${fmt(+p.max)}`:"Approve all open bills",
  run:p=>{const o=S.bill.filter(b=>(b.s=="Open"||b.s=="Overdue")&&(!+p.max||b.a<=+p.max));o.forEach(b=>b.s="Approved");return o.length?`Approved ${plural(o.length,"bill")}: ${o.map(b=>b.n).join(", ")} (${fmt(sum(o))})`:"No open bills matched"}},
 paybills:{n:"Pay approved bills",ps:[],d:()=>"Pay every approved bill",run:()=>{const o=S.bill.filter(b=>b.s=="Approved");o.forEach(b=>{b.s="Paid";CASH-=b.a});return o.length?`Paid ${plural(o.length,"bill")}, ${fmt(sum(o))} left your bank`:"No approved bills to pay"}},
 markinv:{n:"Mark invoice as paid",ps:[{k:"doc",l:"Invoice",q:"Which invoice should I mark as paid?",ty:"ch",o:invOpts,none:"Every invoice is already paid."}],d:p=>`Mark ${p.doc}${info(p.doc)} as paid`,
  run:p=>{const o=S.inv.find(x=>x.n==p.doc);if(!o)return p.doc+" no longer exists";if(o.s=="Paid")return p.doc+" was already paid";o.s="Paid";CASH+=o.a;return`${o.n} from ${o.c} is paid, ${fmt(o.a)} added to cash`}},
 markbill:{n:"Mark bill as paid",ps:[{k:"doc",l:"Bill",q:"Which bill should I mark as paid?",ty:"ch",o:billOpts,none:"Every bill is already paid."}],d:p=>`Mark ${p.doc}${info(p.doc)} as paid`,
  run:p=>{const o=S.bill.find(x=>x.n==p.doc);if(!o)return p.doc+" no longer exists";if(o.s=="Paid")return p.doc+" was already paid";o.s="Paid";CASH-=o.a;return`${o.n} to ${o.c} is paid, ${fmt(o.a)} left your bank`}},
 categorise:{n:"Categorise bank feed",ps:[{k:"mode",l:"Which transactions",q:"Which bank transactions should I categorise?",ty:"ch",o:()=>[["Only above 90% confidence","90"],["Everything pending","0"]]}],
  d:p=>+p.mode?"Accept bank categories above 90% confidence":"Accept every pending bank category",
  run:p=>{const o=S.bank.filter(x=>!x.ok&&(!+p.mode||x.p>+p.mode));o.forEach(x=>x.ok=1);return o.length?`Categorised ${plural(o.length,"bank transaction")}`:"Nothing was waiting for review"}},
 createinv:{n:"Create invoice",ps:[{k:"c",l:"Customer",q:"Which customer is this invoice for?",ty:"ch",o:()=>S.cust.map(x=>[x.c,x.c])},{k:"a",l:"Amount (₹)",q:"What’s the amount? For example 50000 or 1.2L",ty:"num"}],
  d:p=>`Create an invoice for ${p.c}, ${fmt(+p.a)}, due in 30 days`,
  run:p=>{const n=nextNo(S.inv,"INV-"),d=new Date(),du=iso(new Date(+d+30*864e5));S.inv.unshift({n,c:p.c,d:iso(d),du,a:+p.a,s:"Sent"});return`${n} created and sent to ${p.c}, ${fmt(+p.a)}, due ${du}`}},
 newbill:{n:"Create bill",ps:[{k:"c",l:"Vendor",q:"Which vendor is the bill from?",ty:"ch",o:()=>S.ven.map(x=>[x.c,x.c])},{k:"a",l:"Amount (₹)",q:"What’s the amount?",ty:"num"},{k:"due",l:"Due in",q:"When is it due?",ty:"ch",o:()=>[["In 7 days","7"],["In 15 days","15"],["In 30 days","30"]]}],
  d:p=>`Record a bill from ${p.c}, ${fmt(+p.a)}, due in ${p.due} days`,
  run:p=>{const n=nextNo(S.bill,"BILL-"),d=new Date();S.bill.unshift({n,c:p.c,d:iso(d),du:iso(new Date(+d+p.due*864e5)),a:+p.a,s:"Open"});return`${n} recorded for ${p.c}, ${fmt(+p.a)}`+(p.file?`, with ${p.file} attached`:"")}},
 newexp:{n:"Add expense",ps:[{k:"n",l:"Description",q:"What’s the expense for?",ty:"text"},{k:"a",l:"Amount (₹)",q:"How much was it?",ty:"num"},{k:"cat",l:"Category",q:"Which category?",ty:"ch",o:()=>CATS.map(c=>[c,c])}],
  d:p=>`Add expense “${p.n}”, ${fmt(+p.a)}, ${p.cat}`,run:p=>{S.exp.unshift({n:p.n,c:p.cat,d:iso(new Date()),a:+p.a,f:p.file});return`Expense added: ${p.n}, ${fmt(+p.a)}`+(p.file?`, with ${p.file} attached`:"")}},
 del:{n:"Delete invoice or bill",noauto:1,ps:[{k:"type",l:"Type",q:"Is it an invoice or a bill?",ty:"ch",o:()=>[["Invoice","inv"],["Bill","bill"]]},{k:"doc",l:"Document",q:"Which one should I delete?",ty:"ch",o:v=>(v.type=="inv"?S.inv:S.bill).map(o=>[`${o.n} · ${o.c} · ${fmt(o.a)} · ${o.s}`,o.n]),none:"There’s nothing to delete."}],
  d:p=>`Delete ${p.doc}${info(p.doc)}. This can’t be undone`,run:p=>{const k=p.type=="inv"?"inv":"bill",i=S[k].findIndex(x=>x.n==p.doc);if(i<0)return p.doc+" was not found";const o=S[k].splice(i,1)[0];return`${o.n} (${o.c}, ${fmt(o.a)}) deleted`}},
 report:{n:"Generate report (PDF)",nc:1,ps:[{k:"rep",l:"Report",q:"Which report do you need?",ty:"ch",o:()=>REPS.map(r=>[r,r])}],d:p=>`Prepare the ${p.rep} report as a PDF`,run:p=>({m:`${p.rep} is ready as a PDF`,act:"pdf:"+p.rep})}
};
const GO={chase:"invoices",markinv:"invoices",createinv:"invoices",approve:"bills",paybills:"bills",markbill:"bills",newbill:"bills",newexp:"expenses",categorise:"banking",report:"reports",remind:"automations"};

/* ---------- automation engine ---------- */
function log(name,res){S.log.unshift(["Today, "+tnow(),name,esc(res)]);S.log.length=Math.min(S.log.length,20)}
function runAuto(a,manual){let res="Done",r;const k=A[a.k];if(a.k!="none")live("Running: "+a.n);
 try{r=k?k.run(a.p||{},a):"Watching for new receipts";res=typeof r=="object"?r.m:r}catch(e){res="Failed: "+e.message}
 a.r++;a.lt=Date.now();log(a.n,res);if(a.k=="none")return res;feedAdd(manual?"Manual":"Scheduled",a.n+": "+res);if(!manual)gtoast(a.n+": "+res,a.k!="categorise");
 if(r&&r.act)notify("Report ready",r.m,r.act,0);else if(a.k!="remind")notify(a.n,res,null,1);return res}
function tick(){const now=Date.now();let ch=0;
 S.auto.forEach(a=>{if(a.on&&a.nx&&now>=a.nx&&a.k&&a.k!="none"){runAuto(a);ch=1;if(a.sch.f=="once"){a.on=0;a.nx=null}else a.nx=next(a.sch,now)}});
 if(ch){save();refresh()}}
function addAuto(kind,v,sch){const p={};(A[kind].ps||[]).forEach(s=>{if(v[s.k]!=null)p[s.k]=v[s.k]});if(v.file)p.file=v.file;
 const a={n:A[kind].d(p).slice(0,70),k:kind,p,sch,on:1,r:0,lt:0,nx:sch.f=="once"?sch.ts:next(sch)};S.auto.unshift(a);save();return a}
const describe=a=>a.k&&A[a.k]?A[a.k].d(a.p||{}):a.t||"Watch for receipts";
let dirty=0;
function refresh(){const a=document.activeElement;if(location.hash=="#assistant")return;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||$("#dlg").open){dirty=1;return}render()}
document.addEventListener("focusout",()=>{if(dirty)setTimeout(()=>{const a=document.activeElement;if(!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))&&!$("#dlg").open){dirty=0;render()}},60)});
$("#dlg").addEventListener("close",()=>{if(dirty){dirty=0;render()}});

/* ---------- reminder banners ---------- */
function banner(n){let e=document.getElementById("rb");if(!e){e=document.createElement("div");e.id="rb";e.setAttribute("aria-live","assertive");document.body.appendChild(e)}
 const d=document.createElement("div");d.className="rbn";d.dataset.id=n.id;
 d.innerHTML=`<b>${esc(n.t)}</b><p>${esc(n.m)}</p><div class="rbb">${n.act?`<button class="btn btn-primary btn-sm" data-a="${esc(n.act)}">Download PDF</button>`:`<button class="btn btn-soft btn-sm" data-a="bn-snz:${n.id}">Snooze 5 min</button>`}<button class="btn btn-quiet btn-sm" data-a="bn-x:${n.id}">Dismiss</button></div>`;e.appendChild(d)}
function dismiss(id){S.nt=S.nt.filter(x=>x.id!=id);const b=document.querySelector(`.rbn[data-id="${id}"]`);if(b)b.remove();save();refresh()}

/* ---------- PDF (hand-built, no libraries) ---------- */
const pf=n=>(n<0?"-":"")+"Rs. "+Math.abs(n).toLocaleString("en-IN");
const clean=s=>String(s).replace(/[^\x20-\x7e]/g,c=>({"’":"'","–":"-","−":"-","·":"-","₹":"Rs."}[c]||"")).replace(/([\\()])/g,"\\$1");
const cw=(c,b)=>(/[0-9]/.test(c)?.556:/[ ,.:;\/]/.test(c)?.278:/[ijl]/.test(c)?.222:/[frt]/.test(c)?.3:c=="-"?.333:/[mw]/.test(c)?.8:/[A-Z]/.test(c)?.67:.5)*(b?1.06:1);
const tw=(s,z,b)=>[...String(s)].reduce((t,c)=>t+cw(c,b),0)*z;
const T=(s,x,y,z=10,b=0,col="0.12 0.14 0.2")=>`${col} rg BT /F${b?2:1} ${z} Tf ${x.toFixed(1)} ${(842-y).toFixed(1)} Td (${clean(s)}) Tj ET\n`;
const TR=(s,x,y,z,b,col)=>T(s,x-tw(clean(s).replace(/\\/g,""),z,b),y,z,b,col);
function repData(name){
 if(R[name])return{c:[["Line",50,0],["Amount, October 2026",545,1]],r:R[name].map(r=>({c:[r[0],pf(r[1])],b:/^(gross|net|total|equity|closing|payable)/i.test(r[0])}))};
 if(name=="Invoice register"||name=="Bill register"){const inv=name[0]=="I",a=inv?S.inv:S.bill;return{c:[["Number",50,0],[inv?"Customer":"Vendor",120,0],["Due",290,0],["Status",360,0],["Amount",545,1]],r:[...a.map(o=>({c:[o.n,o.c,o.du,o.s,pf(o.a)]})),{c:["Total","","","",pf(sum(a))],b:1}]}}
 return{c:[["Date",50,0],["Description",120,0],["Category",290,0],["Status",390,0],["Amount",545,1]],r:S.bank.map(x=>({c:[x.d,x.t,x.k,x.ok?"Categorised":"Pending",pf(x.a)]}))}}
function buildPdf(name){const d=repData(name),pages=[],stamp=new Date().toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
 let c="",y=0;const head=(first)=>{c=first?`0 0.4 1 rg 0 752 595 90 re f\n`+T(name,50,52,22,1,"1 1 1")+T(PROFILE.org+"  |  Generated "+stamp,50,74,10,0,"0.85 0.92 1"):T(name+" (continued)",50,50,12,1);
  y=first?125:80;c+=`0.94 0.95 0.98 rg 40 ${842-y-16} 515 24 re f\n`;d.c.forEach(h=>{c+=h[2]?TR(h[0],h[1],y+8,9,1,"0.4 0.43 0.5"):T(h[0],h[1],y+8,9,1,"0.4 0.43 0.5")});y+=34};
 head(1);d.r.forEach(r=>{if(y>780){pages.push(c);head(0)}
  r.c.forEach((v,i)=>{const h=d.c[i];c+=h[2]?TR(v,h[1],y,10,r.b,"0.12 0.14 0.2"):T(String(v).slice(0,i==1&&d.c.length>2?28:60),h[1],y,10,r.b)});
  c+=`0.9 0.91 0.94 RG 0.5 w 50 ${842-y-8} m 545 ${842-y-8} l S\n`;y+=24});
 pages.push(c);pages.forEach((p,i)=>pages[i]=p+T(`Page ${i+1} of ${pages.length}   |   Prepared by Penny, Ledger's AI assistant`,50,826,8,0,"0.5 0.53 0.6"));
 const o=[];const add=s=>o.push(s);add("<</Type/Catalog/Pages 2 0 R>>");add(`<</Type/Pages/Kids[${pages.map((_,i)=>`${5+i*2} 0 R`).join(" ")}]/Count ${pages.length}>>`);
 add("<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>");add("<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>");
 pages.forEach((p,i)=>{add(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ${6+i*2} 0 R>>`);add(`<</Length ${p.length}>>\nstream\n${p}endstream`)});
 let out="%PDF-1.4\n";const off=o.map((s,i)=>{const n=out.length;out+=`${i+1} 0 obj\n${s}\nendobj\n`;return n}),x=out.length;
 out+=`xref\n0 ${o.length+1}\n0000000000 65535 f \n`+off.map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<</Size ${o.length+1}/Root 1 0 R>>\nstartxref\n${x}\n%%EOF`;
 return new Blob([out],{type:"application/pdf"})}
function downloadPdf(name){const u=URL.createObjectURL(buildPdf(name)),a=document.createElement("a");a.href=u;a.download=`Ledger-${name.replace(/\W+/g,"-").toLowerCase()}-${iso(new Date())}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("PDF downloaded")}

/* ---------- Penny: chat engine ---------- */
const CH=window.CH={m:[],f:null,typing:0,file:null};let PEND=null;
const SUGG=["Remind me on Friday at 9am to chase overdue invoices","Approve all bills under ₹50,000 every day at 10am","Mark INV-1042 as paid","Create an invoice for Orbit Labs","Download Profit and loss as a PDF","Accept all bank suggestions above 90%"];
const SUG=[["Invoice or GST reminder","Remind me"],["Approve bills","Approve bills"],["Mark an invoice paid","Mark invoice as paid"],["Make a PDF report","Generate a PDF report"]];
const CONF=[["Confirm","yes"],["Cancel","no"]],WH=[["In 2 minutes","in 2 minutes"],["In 1 hour","in 1 hour"],["Tomorrow 9am","tomorrow at 9am"],["Every day 9am","every day at 9am"],["Every Monday 10am","every monday at 10am"],["Monthly on the 1st","every month on the 1st"]];
const MENU=[["Automate",[["automate","zap","Create automation","Run any task on a schedule"],["remind","bell","Bookkeeping reminder","Chase an invoice or a GST due date"],["autopilot","zap","Autopilot","Turn on, pause or tune routine work"]]],
 ["Invoices and bills",[["markinv","invoices","Mark invoice paid","Updates cash instantly"],["markbill","bills","Mark bill paid",""],["approve","check","Approve bills","All, or up to an amount"],["createinv","plus","Create invoice",""],["newbill","plus","Create bill",""],["del","x","Delete invoice or bill",""]]],
 ["Banking, reports and files",[["categorise","banking","Categorise bank feed","Accept AI suggestions"],["report","reports","Generate report as PDF","Downloads a real PDF"],["newexp","expenses","Add expense",""],["upload","file","Upload a document","Then turn it into an expense or bill"]]]];
const SLOT_KIND={k:"kind",q:"What should this automation do?",ty:"ch",o:()=>Object.keys(A).filter(k=>!A[k].noauto).map(k=>[A[k].n,k])};
const SLOT_WHEN={k:"when",q:"When should it run? Try “in 10 minutes”, “every day at 9am”, “every Monday 10:00”, “tomorrow 5pm” or “on 5 Nov at 3pm”.",ty:"when",err:"I couldn’t work out the timing. Try “in 10 minutes”, “every day at 9am” or “on 5 Nov at 3pm”. It has to be in the future."};
const slotsOf=f=>f.id=="automate"?[SLOT_KIND,...(A[f.v.kind]?A[f.v.kind].ps:[]),SLOT_WHEN]:A[f.id].ps;
const kindOf=f=>f.id=="automate"?f.v.kind:f.id;
function nextSlot(f){for(const s of slotsOf(f)){if(s.ty=="ch"&&f.v[s.k]!=null&&!s.o(f.v).some(o=>String(o[1])==String(f.v[s.k])))delete f.v[s.k];if(f.v[s.k]==null)return s}return null}
const chipsFor=(s,f)=>s.ty=="ch"?s.o(f.v):s.ty=="when"?WH:s.ch||null;
function parseSlot(s,t,f){t=t.trim();if(!t)return null;
 if(s.ty=="text")return t;
 if(s.ty=="num"){if(s.opt&&/^(any|no limit|all|none|0)/i.test(t))return 0;const n=parseNum(t)||amt(t);return n>0?n:null}
 if(s.ty=="when"){if(/^(now|right now|immediately)$/i.test(t))return{f:"once",ts:Date.now()+3000};return parseWhen(t)}
 return matchOpt(s.o(f.v),t)}
function intent(t){const s=t.toLowerCase().trim();
 if(/^(hi|hello|hey|yo|good (morning|evening))\b/.test(s)&&s.length<24)return{id:"hello"};
 if(/\b(what can you do|help me|capabilit)/.test(s)||s=="help")return{id:"help"};
 if(/\b(list|show|what).*(automations|reminders|schedules)\b/.test(s)&&!/\b(create|set|add|make)\b/.test(s))return{id:"autos"};
 if(/\bauto-?pilot\b|(hide|mute|silence|show).{0,20}(toasts?|notifications?)/.test(s))return{id:"ap"};
 if(/^(what|which|who|how|when|where|why|is|are|do|does|tell me|show me)\b/.test(s)&&!/\b(remind|create|approve|mark|delete|automate|pdf|report)\b/.test(s))return null;
 let k=null;
 if(/\bremind me\b|set (a )?reminder|reminder for me|\bnotify me\b|\balert me\b/.test(s))k="remind";
 else if(/\b(chase|dunning)\b|remind.*(customer|client|overdue)|send.*reminders?/.test(s))k="chase";
 else if(/\b(delete|remove)\b/.test(s)&&/\b(inv|bill|invoice)/.test(s))k="del";
 else if(/\bapprove/.test(s))k="approve";
 else if(/\bpdf\b|(generate|create|make|export|prepare|download|build|give me|new).{0,25}(report|statement|p&l|profit and loss|balance sheet|cash flow|register)/.test(s))k="report";
 else if(/(add|create|new|record|log).{0,15}expense/.test(s))k="newexp";
 else if(/(add|create|new|record|raise).{0,15}bill\b/.test(s))k="newbill";
 else if(/(create|raise|new|make|generate|send).{0,20}invoice/.test(s))k="createinv";
 else if(/\bpaid\b|(mark|set|record).{0,20}\bpaid/.test(s))k=/\bbill\b|bill[- ]?\d/.test(s)?"markbill":"markinv";
 else if(/pay.{0,15}bills?/.test(s))k="paybills";
 else if(/categoris|categoriz|reconcil|bank feed|bank suggestions|accept.*(suggest|categor)/.test(s))k="categorise";
 const sched=/\b(every|each|daily|weekly|monthly|automat|schedule|repeat|recurring)\w*/.test(s);
 if(k=="remind")return{id:"automate",kind:"remind"};
 if(k){if(sched||(k!="report"&&k!="del"&&parseWhen(t)))return{id:"automate",kind:k};return{id:k}}
 return sched?{id:"automate"}:null}
function prefill(f,t){const v=f.v,s=t.toLowerCase(),id=kindOf(f)||"",set=(k,x)=>{if(x!=null&&x!==""&&x!==0&&v[k]==null)v[k]=x};
 if(f.id=="automate"){const w=parseWhen(t);if(w)v.when=w}
 const dm=t.match(/\b(inv|bill)[- ]?(\d{3,})\b/i);
 if(dm){set("doc",dm[1].toUpperCase()+"-"+dm[2]);if(id=="del")set("type",dm[1].toLowerCase()=="inv"?"inv":"bill")}else if(id=="del")set("type",/\bbill/.test(s)?"bill":/invoice/.test(s)?"inv":null);
 const am=amt(t);if(id=="approve")set("max",am);if(/^(createinv|newbill|newexp)$/.test(id))set("a",am);
 if(id=="createinv")set("c",findName(S.cust,s));if(id=="newbill")set("c",findName(S.ven,s));
 if(id=="report")set("rep",REPS.find(r=>s.includes(r.toLowerCase()))||(/\bp&l\b|profit/.test(s)?"Profit and loss":/balance/.test(s)?"Balance sheet":/cash flow/.test(s)?"Cash flow":/aged|receivable/.test(s)?"Aged receivables":/\bgst\b/.test(s)?"GST summary":null));
 if(id=="categorise")set("mode",/90/.test(s)?"90":/everything|all pending/.test(s)?"0":null);
 if(id=="remind"){let m=(" "+t.replace(/^.*?remind(?:er)?(?: me)?\s*(?:to|about|of)?\s*/i,"")).split(/\s+(?:in\s+\d|in an?\s|every\b|each\b|tomorrow|today|tonight|at\s+\d|on\s+(?:mon|tue|wed|thu|fri|sat|sun|\d)|next\s)/i)[0].trim();
  if(m.length<2){const x=t.match(/\b(?:to|about)\s+(.+)$/i);m=x?x[1].trim():""}
  if(m.length>1&&!/^(me|remind me)$/i.test(m))set("msg",m[0].toUpperCase()+m.slice(1))}}
const cardH=c=>`<div class="pn-card">${c.rows.map(r=>`<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join("")}</div>`;
const EMPTY=()=>`<div class="pn-empty"><span class="pn-av">${ico("sparkles",26)}</span><h2>Hi ${PROFILE.name.split(" ")[0]}, I’m Penny.</h2><p>Ask about your books, or tell me what to do. I can run it now or automate it for later.</p><div class="pn-sg">${SUGG.map((q,i)=>`<button type="button" data-a="ps:${i}">${esc(q)}</button>`).join("")}</div></div>`;
function chatInner(){if(!CH.m.length&&!CH.typing)return EMPTY();const last=CH.m.length-1,av=`<span class="pn-av">${ico("sparkles",16)}</span>`;
 return CH.m.map((m,i)=>m.r=="u"?`<div class="pn-row u"><div class="pn-u">${m.h}</div></div>`:`<div class="pn-row">${av}<div class="pn-a">${m.h}${m.card?cardH(m.card):""}${m.chips&&i==last&&!CH.typing?`<div class="chips pn-ch">${m.chips.map((c,j)=>`<button type="button" class="chip" data-a="pc:${j}">${esc(c[0])}</button>`).join("")}</div>`:""}</div></div>`).join("")+(CH.typing?`<div class="pn-row">${av}<div class="pn-a"><span class="dots"><i></i><i></i><i></i></span></div></div>`:"")}
function paint(){const c=$("#chat");if(!c)return;c.innerHTML=chatInner();c.scrollTop=c.scrollHeight;const n=$("#pnew");if(n)n.hidden=!CH.m.length}
function say(h,o={}){CH.typing++;paint();setTimeout(()=>{CH.typing--;CH.m.push({r:"a",h,...o});paint()},360)}
function send(text,raw){text=String(text).trim();if(!text)return;CH.m.forEach(m=>m.chips=null);CH.m.push({r:"u",h:esc(text)});paint();route(raw!=null?raw:text)}
function route(t){const f=CH.f;
 if(/^(cancel|never ?mind|stop|forget it|no thanks?)$/i.test(t.trim())&&(f||CH.file)){CH.f=null;CH.file=null;return say("No problem, I’ve dropped that. Nothing was changed.",{chips:SUG})}
 if(f&&f.step=="confirm"){if(/^(y|yes|yep|yeah|confirm|ok|okay|do it|go|sure|go ahead)\b/i.test(t))return exec(f);if(/^(n|no|nope)\b/i.test(t)){CH.f=null;return say("Cancelled. Nothing was changed.",{chips:SUG})}return say("Shall I go ahead?",{chips:CONF})}
 if(f&&f.step=="slot"){const s=f.cur,val=parseSlot(s,t,f);if(val!=null){f.v[s.k]=val;return advance(f)}
  if(s.ty=="text"||!intent(t)){const c=chipsFor(s,f);return say(s.err||(s.ty=="num"?"I need an amount, like 50000 or 1.2L.":s.ty=="ch"?"Please pick one of these, or type part of its name.":"Sorry, I couldn’t read that. ")+(s.ty=="ch"||s.ty=="num"?"":" "+s.q),{chips:c})}
  CH.f=null}
 const it=intent(t);
 if(!it)return say(qa(t)+`<br><span class="mu">Tap + to see everything I can do.</span>`,{chips:SUG});
 start(it,t)}
const HELP=`I can chat about your books and <b>do things for you</b>:<br>• Set bookkeeping reminders, like chasing an invoice or a GST due date<br>• Automate tasks: approve bills, chase overdue invoices, categorise the bank feed, create invoices<br>• Turn <b>autopilot</b> on or off, set its pace and notifications<br>• Mark invoices or bills paid, create or delete them<br>• Turn an uploaded document into an expense or bill<br>• Build a report and download it as a PDF<br><span class="mu">Tap + for a guided menu, or just type what you need.</span>`;
function autosSummary(){const on=S.auto.filter(a=>a.on&&a.nx);return`You have ${plural(S.auto.length,"automation")}, ${on.length} scheduled to run.`+(on.length?"<br>"+on.sort((a,b)=>a.nx-b.nx).slice(0,4).map(a=>`• ${esc(a.n)}: next ${fdt(a.nx)}`).join("<br>"):"")}
function qa(q){return reply(q)}
function start(it,t){
 if(it.id=="hello")return say("Hi Ravi! Tell me what you need, or tap <b>+</b> to automate something.",{chips:SUG});
 if(it.id=="ap")return apCmd(t||"");
 if(it.id=="help")return say(HELP,{chips:SUG});
 if(it.id=="autos")return say(autosSummary(),{chips:[["Open automations","@go:automations"],["New automation","Create an automation"]]});
 const f={id:it.id,v:{},step:"slot"};CH.f=f;if(it.kind)f.v.kind=it.kind;prefill(f,t||"");
 if(CH.file&&/^(newexp|newbill)$/.test(kindOf(f))){f.v.file=CH.file.name;if(kindOf(f)=="newexp"&&f.v.n==null)f.v.n="Receipt: "+CH.file.name.replace(/\.[^.]+$/,"")}
 advance(f,1)}
function advance(f,first){const s=nextSlot(f),got=first&&Object.keys(f.v).filter(k=>k!="kind").length?"Got it. ":"";
 if(s){f.cur=s;const o=s.ty=="ch"?s.o(f.v):null;if(o&&!o.length){CH.f=null;return say(s.none||"There’s nothing to choose from right now.")}return say(got+s.q,{chips:chipsFor(s,f)})}
 if(A[kindOf(f)].nc)return exec(f);
 f.step="confirm";const k=kindOf(f),rows=f.id=="automate"?[["Task",A[k].d(f.v)],["Runs",schLabel(f.v.when)]]:[["Task",A[k].d(f.v)]];if(f.v.file)rows.push(["Attachment",f.v.file]);
 say("Here’s what I’ll do. Shall I go ahead?",{card:{rows},chips:CONF})}
function exec(f){CH.f=null;const k=kindOf(f);
 if(f.id=="automate"){const a=addAuto(k,f.v,f.v.when);try{if(k=="remind"&&window.Notification&&Notification.permission=="default")Notification.requestPermission()}catch(e){}
  return say(`Done. <b>${esc(a.n)}</b> is set.<br>${esc(schLabel(a.sch))}.${a.sch.f=="once"?"":` Next run: <b>${fdt(a.nx)}</b>.`}<br><span class="mu">Automations run while Ledger is open in a browser tab, since everything runs in your browser. Anything missed runs when you come back.</span>`,{chips:[["View automations","@go:automations"],["Create another","Create an automation"]]})}
 const r=A[k].run(f.v),m=typeof r=="object"?r.m:r;CH.file=null;save();log("Penny: "+A[k].n,m);
 if(r&&r.act){downloadPdf(f.v.rep);return say(`${ico("check",16)} ${esc(m)}. Your download should have started.`,{chips:[["Download again","@"+r.act],["Make another report","Generate a PDF report"]]})}
 const go=k=="del"?(f.v.type=="inv"?"invoices":"bills"):GO[k];
 say(`${ico("check",16)} ${esc(m)}.`,{chips:[...(go?[["Open "+go,"@go:"+go]]:[]),["Do something else","What can you do?"]]})}
function newChat(){CH.m=[];CH.f=null;CH.file=null;CH.typing=0;paint()}
function menuStart(id){const mm=MENU.flatMap(g=>g[1]).find(x=>x[0]==id);$("#pmenu").hidden=true;
 if(id=="upload")return $("#pfile").click();
 if(id=="autopilot"){CH.m.forEach(m=>m.chips=null);CH.m.push({r:"u",h:"Autopilot"});paint();return apCmd("")}
 CH.m.forEach(m=>m.chips=null);CH.m.push({r:"u",h:esc(mm[2])});paint();CH.f=null;
 start(id=="automate"?{id:"automate"}:id=="remind"?{id:"automate",kind:"remind"}:{id},"")}

/* ---------- pages ---------- */
P.assistant=()=>`<div class="pn"><div class="pn-top"><b><span class="pn-av">${ico("sparkles",16)}</span>Penny <em>AI assistant</em></b><button class="btn btn-ghost btn-sm" id="pnew" data-a="pnew" ${CH.m.length?"":"hidden"}>New chat</button></div>
<div class="pn-scroll" id="chat" aria-live="polite">${chatInner()}</div>
<div class="pn-dock"><div class="pn-menu" id="pmenu" hidden>${MENU.map(([g,it])=>`<h3>${g}</h3>`+it.map(x=>`<button type="button" data-a="pstart:${x[0]}"><span class="fi">${ico(x[1],18)}</span><span><b>${x[2]}</b>${x[3]?`<small>${x[3]}</small>`:""}</span></button>`).join("")).join("")}</div>
<form id="pf" class="pn-box"><button type="button" class="pn-plus" data-a="pm" aria-label="Add an action or upload a file">${ico("plus",20)}</button><textarea id="pi" rows="1" placeholder="Message Penny, or tap + to automate something" aria-label="Message Penny"></textarea><button class="pn-send" aria-label="Send">${ico("arrow-right",18)}</button></form>
<input type="file" id="pfile" hidden accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt"><div class="pn-hint">Penny works inside this app only. Nothing leaves your browser.</div></div></div>`;
NAV[0][1][1][1]="Penny (AI)";
const st=(l,v)=>`<div class="card kpi"><span>${l}</span><b>${v}</b></div>`;
const PWR='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v9"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>';
P.automations=()=>{const a_=S.auto,runs=sum(a_,x=>x.r),nx=a_.filter(a=>a.on&&a.nx).sort((a,b)=>a.nx-b.nx)[0],st=(l,v)=>`<div class="card kpi"><span>${l}</span><b>${v}</b></div>`;
 return head("Automations",`<button class="btn ap-pw ${S.ap.on?"on":""}" data-a="ap-pwr" role="switch" aria-checked="${!!S.ap.on}" aria-label="Autopilot power">${PWR}Autopilot ${S.ap.on?"On":"Off"}</button> <button class="btn btn-ghost" data-a="go:autopilot">Autopilot settings</button> <button class="btn btn-primary" data-a="newauto">New automation</button>`)
 +`<div class="d-grid gap-3 mb-3 g4">${st("Running now",a_.filter(a=>a.on).length+" of "+a_.length)}${st("Tasks automated",runs)}${st("Hours saved",Math.round(runs/6))}${st("Next run",nx?fdt(nx.nx):"None")}</div>`
 +a_.map((a,i)=>`<div class="card wf"><div class="wh"><div><b>${esc(a.n)}</b><span>${a.r} runs, last run ${a.lt?ago(a.lt):esc(a.l||"never")}. ${a.on&&a.nx?"Next "+fdt(a.nx):a.sch&&a.sch.f=="once"&&a.r?"Completed":a.k=="none"?"Waiting for an upload":"Paused"}</span></div><div class="wa"><button class="btn btn-ghost" data-a="arun:${i}">Run now</button><button class="icon-btn" data-a="adel:${i}" aria-label="Delete ${esc(a.n)}">${ico("x",18)}</button><div class="form-check form-switch m-0"><input class="form-check-input" role="switch" type="checkbox" data-a="atog:${i}" ${a.on?"checked":""} aria-label="Turn ${esc(a.n)} on or off"></div></div></div><div class="flow"><em>When</em><u>${esc(schLabel(a.sch))}</u><i>${ico("arrow-right",14)}</i><em>Do</em><u>${esc(describe(a))}</u></div></div>`).join("")
 +`<div class="card"><h2>History and activity log</h2>${tbl(["Time","Automation","Result"],S.log)}</div>`};
P.autopilot=()=>head("Autopilot",`<a class="btn btn-ghost" href="#automations">${ico("arrow-right",16).replace("<svg",'<svg style="transform:rotate(180deg)"')}Back to automations</a> <button class="btn ap-pw ${S.ap.on?"on":""}" data-a="ap-pwr" role="switch" aria-checked="${!!S.ap.on}" aria-label="Autopilot power">${PWR}${S.ap.on?"On":"Off"}</button>`)+apCard()+`<div class="card"><h2>Recent autopilot activity</h2>${tbl(["Time","Task","Result"],S.log.filter(r=>r[1]=="Autopilot").slice(0,8).length?S.log.filter(r=>r[1]=="Autopilot").slice(0,8):[["—","Autopilot","Nothing yet. Turn it on to see activity here."]])}</div>`;
function devModal(){const d=$("#dlg");d.innerHTML=`<div><h2>Developer mode</h2><p style="color:var(--mu)">Tools for testing the demo. They are hidden from the normal interface.</p><div class="d-grid gap-2"><button class="btn btn-ghost" data-a="lv-test">Run quick test</button><button class="btn btn-ghost" data-a="ag-reset">Reset sample data</button></div></div>`;d.insertAdjacentHTML("beforeend",'<button class="btn-close" data-a="close" aria-label="Close"></button>');if(!d.open)d.showModal()}
P.reports=()=>head("Reports",`<button class="btn btn-primary" data-a="pdf:${esc(REP)}">${ico("file",18)}Download PDF</button> <button class="btn btn-ghost" data-a="ag-pen">Ask Penny</button>`)+`<div class="nav nav-pills gap-1" style="margin-bottom:14px">${Object.keys(R).map(k=>`<button class="nav-link ${k==REP?"active":""}" data-a="rep:${k}">${k}</button>`).join("")}</div><div class="card rep"><h2>${REP}</h2>${tbl(["Line","Amount, October 2026"],R[REP].map(r=>[r[0],fmt(r[1])]),[1])}</div>`;
window.rowAct=(k,i,o)=>{const b=(a,t,c="")=>`<button class="btn btn-link btn-sm p-0 ${c}" data-a="${a}:${k}:${i}">${t}</button>`,x=[];
 if(k=="bill"&&(o.s=="Open"||o.s=="Overdue"))x.push(b("ag-appr","Approve"));if(k=="inv"&&(o.s=="Sent"||o.s=="Overdue"))x.push(b("ag-rem","Remind"));
 if(o.s!="Paid")x.push(b("paid","Mark paid"));x.push(b("ag-del","Delete","text-danger"));return`<span class="d-inline-flex gap-3">${x.join("")}</span>`};
window.ask=q=>{if(location.hash!="#assistant"){PEND=q;location.hash="assistant"}else send(q)};
window.modalA=()=>{const kinds=Object.keys(A).filter(k=>!A[k].noauto),today=iso(new Date());
 $("#dlg").innerHTML=`<form id="fa2"><h2>New automation</h2><label class="form-label w-100 mb-3">What should it do?<select class="form-select" name="k">${kinds.map(k=>`<option value="${k}">${A[k].n}</option>`).join("")}</select></label><div id="fp"></div>
 <label class="form-label w-100 mb-3">Repeat<select class="form-select" name="f"><option value="once">Once</option><option value="min">Every few minutes</option><option value="daily" selected>Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label>
 <div class="row g-2 mb-3"><label class="col form-label" data-s="once">Date<input class="form-control" type="date" name="dt" value="${today}"></label><label class="col form-label" data-s="min">Every (minutes)<input class="form-control" type="number" min="1" name="ev" value="5"></label><label class="col form-label" data-s="once daily weekly monthly">Time<input class="form-control" type="time" name="tm" value="09:00"></label><label class="col form-label" data-s="monthly">Day of month<input class="form-control" type="number" min="1" max="31" name="dom" value="1"></label></div>
 <div class="mb-3" data-s="weekly"><div class="chips">${DAY.map((n,i)=>`<label class="chip"><input type="checkbox" name="wd" value="${i}" ${i==1?"checked":""}> ${n}</label>`).join("")}</div></div>
 <div class="row-end"><button type="button" class="btn btn-quiet" data-a="close">Cancel</button><button class="btn btn-primary">Save automation</button></div></form>`;dopen();syncForm()};
function syncForm(){const f=$("#fa2");if(!f)return;const k=f.elements.k.value,fr=f.elements.f.value;
 if(f.dataset.k!=k){f.dataset.k=k;$("#fp").innerHTML=A[k].ps.map(s=>s.ty=="ch"?`<label class="form-label w-100 mb-3">${s.l}<select class="form-select" name="p_${s.k}">${s.o({}).map(o=>`<option value="${esc(o[1])}">${esc(o[0])}</option>`).join("")}</select></label>`:`<label class="form-label w-100 mb-3">${s.l}<input class="form-control" name="p_${s.k}" ${s.ty=="num"?'type="number" min="0"':""} ${s.opt?"":"required"} placeholder="${s.ph||""}"></label>`).join("")}
 f.querySelectorAll("[data-s]").forEach(e=>e.hidden=!e.dataset.s.split(" ").includes(fr))}

/* ---------- events ---------- */
document.addEventListener("click",e=>{
 if(!e.target.closest("#pmenu,[data-a=pm]")){const m=$("#pmenu");if(m)m.hidden=true}
 const el=e.target.closest("[data-a]");if(!el)return;const d=el.dataset.a,i=d.indexOf(":"),a=i<0?d:d.slice(0,i),x=i<0?"":d.slice(i+1),[k,n]=x.split(":");
 if(a=="pm"){const m=$("#pmenu");m.hidden=!m.hidden}
 else if(a=="pstart")menuStart(x);
 else if(a=="ps")send(SUGG[+x]);
 else if(a=="pnew")newChat();
 else if(a=="pc"){const m=CH.m[CH.m.length-1],c=m&&m.chips&&m.chips[+x];if(!c)return;const v=String(c[1]);
  if(v[0]=="@"){if(v.startsWith("@go:"))location.hash=v.slice(4);else if(v.startsWith("@pdf:"))downloadPdf(v.slice(5))}else send(c[0],v)}
 else if(a=="lv"){ACT.open=!ACT.open;bubble()}
 else if(a=="lv-ap")setAP(el.checked);
 else if(a=="ap-on"){setAP(el.checked);render()}
 else if(a=="lv-test"){const q=$("#dlg");if(q.open)q.close();ACT.open=1;selfTest()}
 else if(a=="ap-pwr"){setAP(!S.ap.on);render()}
 else if(a=="dev")devModal()
 else if(a=="pdf")downloadPdf(x);
 else if(a=="ag-pen"){location.hash="assistant"}
 else if(a=="ag-appr"){const o=S[k][n];o.s="Approved";save();render();toast(o.n+" approved")}
 else if(a=="ag-rem"){const o=S[k][n];o.rm=(o.rm||0)+1;save();toast("Reminder sent to "+o.c)}
 else if(a=="ag-del"){const o=S[k][n];if(confirm(`Delete ${o.n} (${o.c})? This can’t be undone.`)){S[k].splice(n,1);render();toast(o.n+" deleted")}}
 else if(a=="ntd")dismiss(S.nt[x]&&S.nt[x].id);
 else if(a=="bn-x")dismiss(x);
 else if(a=="bn-snz"){const n_=S.nt.find(y=>y.id==x);if(n_)addAuto("remind",{msg:n_.m},{f:"once",ts:Date.now()+3e5});dismiss(x);toast("Snoozed for 5 minutes")}
 else if(a=="atog"){const z=S.auto[x];z.on=el.checked?1:0;if(z.on&&z.sch){z.nx=z.sch.f=="once"?z.sch.ts:next(z.sch);if(!z.nx){z.on=0;toast("That time has already passed")}}render();toast(z.on?"Automation turned on":"Automation paused")}
 else if(a=="arun"){const z=S.auto[x],r=runAuto(z,1);render();toast(r)}
 else if(a=="adel"){const z=S.auto[x];S.auto.splice(x,1);render();toast("Deleted “"+z.n+"”")}
 else if(a=="ag-reset"){if(confirm("Reset all sample data and automations?")){try{localStorage.removeItem(KEY)}catch(_){}location.reload()}}
 if(/^(ag-|paid|acc|accall|rs|cl|closeai|sugg)/.test(a))save();
});
document.addEventListener("submit",e=>{const f=e.target;
 if(f.id=="pf"){const i=$("#pi"),v=i.value;i.value="";i.style.height="auto";send(v)}
 else if(f.id=="fa2"){const fd=new FormData(f),fr=fd.get("f"),k=fd.get("k"),v={};
  A[k].ps.forEach(s=>{const x=fd.get("p_"+s.k);v[s.k]=s.ty=="num"?(+x||0):x});
  let sch;if(fr=="once"){const ts=+new Date(fd.get("dt")+"T"+fd.get("tm"));if(!(ts>Date.now())){toast("Pick a time in the future");return}sch={f:"once",ts}}
  else if(fr=="min")sch={f:"min",every:Math.max(1,+fd.get("ev")||1)};
  else if(fr=="daily")sch={f:"daily",at:fd.get("tm")};
  else if(fr=="weekly"){const days=fd.getAll("wd").map(Number);if(!days.length){toast("Choose at least one day");return}sch={f:"weekly",days,at:fd.get("tm")}}
  else sch={f:"monthly",dom:Math.min(31,Math.max(1,+fd.get("dom")||1)),at:fd.get("tm")};
  addAuto(k,v,sch);try{if(k=="remind"&&window.Notification&&Notification.permission=="default")Notification.requestPermission()}catch(_){}
  $("#dlg").close();render();toast("Automation saved")}});
document.addEventListener("change",e=>{const t_=e.target;if(t_.dataset&&t_.dataset.ap){S.ap[t_.dataset.ap]=t_.dataset.ap=="limit"?+t_.value:t_.value;save();bubble();toast("Autopilot setting saved")}
 if(t_.dataset&&t_.dataset.apt){if(t_.checked)delete S.ap.off[t_.dataset.apt];else S.ap.off[t_.dataset.apt]=1;save();toast("Autopilot task updated")}
 if(e.target.form&&e.target.form.id=="fa2")syncForm();
 if(e.target.id=="pfile"){const f=e.target.files[0];e.target.value="";if(!f)return;CH.file={name:f.name,size:f.size};CH.m.forEach(m=>m.chips=null);
  CH.m.push({r:"u",h:`<span class="pn-file">${ico("file",16)} ${esc(f.name)} <em>${kb(f.size)}</em></span>`});paint();
  say(`Got <b>${esc(f.name)}</b>. I can’t read inside files in this offline version, so I’ll ask you for the details. What should I do with it?`,{chips:[["Create an expense from it","Add an expense"],["Create a bill from it","Create a bill"],["Never mind","cancel"]]})}});
document.addEventListener("input",e=>{if(e.target.id=="pi"){const t=e.target;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,160)+"px"}});
document.addEventListener("keydown",e=>{if(e.target.id=="pi"&&e.key=="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();$("#pf").requestSubmit()}});

/* ---------- live activity bubble, autopilot demo, quick test ---------- */
const ACT={open:0,cur:null,feed:[],total:0,test:null};let liveT;
function live(l){ACT.cur=l;bubble();clearTimeout(liveT);liveT=setTimeout(()=>{if(!AP.busy){ACT.cur=null;bubble()}},1800)}
function feedAdd(src,m){ACT.feed.unshift({t:tnow(),src,m});ACT.feed.length=Math.min(ACT.feed.length,10);ACT.total++;bubble()}
const AP={t:null,busy:0,i:0,last:0},rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[rnd(0,a.length-1)];
S.ap=Object.assign({on:0,speed:"std",toasts:"imp",limit:100000,off:{}},S.ap);
const SPEED={rel:[45e3,90e3],std:[20e3,45e3],act:[8e3,16e3]},SPN={rel:"Relaxed",std:"Standard",act:"Active"},TON={all:"Every task",imp:"Important only",off:"Off"};
function gtoast(m,imp){const p=S.ap.toasts;if(p=="off"||(p=="imp"&&!imp)||Date.now()-AP.last<6000)return;AP.last=Date.now();toast(m)}
const VEND=[["Zoho Corp","Software",2400],["Uber India","Travel",640],["Cloudflare","Hosting and cloud",1850],["Amazon Business","Office supplies",3120],["Swiggy Corporate","Meals",2750],["Notion Labs","Software",1600]];
const bankTx=(t,a,k,p,ok)=>{S.bank.unshift({d:iso(new Date()),t,a,k,p,ok:ok?1:0});S.bank.length=Math.min(S.bank.length,14)};
const TASKS=[
 {k:"sync",l:"Syncing the bank feed",d:"Imports new transactions and suggests a category for each",f:()=>{const v=pick(VEND),a=-(v[2]+rnd(0,900));bankTx(v[0],a,v[1],rnd(86,99));return`Bank feed: ${v[0]} ${fmt(a)} imported, suggested ${v[1]}`}},
 {k:"cat",l:"Categorising transactions",d:"Accepts suggestions above 90% confidence",f:()=>{const o=S.bank.filter(x=>!x.ok&&x.p>90);if(!o.length)return null;o.forEach(x=>x.ok=1);return`Categorised ${plural(o.length,"transaction")} above 90% confidence`}},
 {k:"match",imp:1,l:"Matching incoming payments",d:"Matches deposits to open invoices and marks them paid",f:()=>{const o=S.inv.filter(i=>i.s=="Sent"||i.s=="Overdue");if(!o.length)return null;const i=o[0];i.s="Paid";CASH+=i.a;bankTx("UPI "+i.c,i.a,"Sales income",99,1);return`Payment of ${fmt(i.a)} from ${i.c} matched to ${i.n} and marked paid`}},
 {k:"appr",imp:1,l:"Approving bills",d:"Approves open bills within your approval limit",f:()=>{const b=S.bill.find(x=>(x.s=="Open"||x.s=="Overdue")&&x.a<=S.ap.limit);if(!b)return null;b.s="Approved";return`Approved ${b.n} from ${b.c}, ${fmt(b.a)}`}},
 {k:"pay",imp:1,l:"Paying approved bills",d:"Pays approved bills and records the bank entry",f:()=>{const b=S.bill.find(x=>x.s=="Approved");if(!b)return null;b.s="Paid";CASH-=b.a;bankTx(b.c,-b.a,/aws|amazon/i.test(b.c)?"Hosting and cloud":/rent|zephyr/i.test(b.c)?"Rent":"Contractor fees",99,1);return`Paid ${b.n} to ${b.c}, ${fmt(b.a)} left the bank`}},
 {k:"chase",imp:1,l:"Chasing overdue invoices",d:"Sends polite reminders to customers",f:()=>S.inv.some(i=>i.s=="Overdue"&&!i.rm)?A.chase.run():null},
 {k:"inv",imp:1,l:"Raising recurring invoices",d:"Creates invoices for retainer customers",f:()=>S.inv.length>=14?null:A.createinv.run({c:pick(S.cust).c,a:pick([27500,35000,48000,62000,85000])})},
 {k:"rcpt",l:"Filing receipts",d:"Turns scanned receipts into expenses",f:()=>{if(S.exp.length>=12)return null;const x=pick([["Cab to client office","Travel"],["Printer paper","Office supplies"],["Team coffee","Meals"],["Domain renewal","Software"]]);return A.newexp.run({n:x[0],cat:x[1],a:rnd(300,4500)})}},
 {k:"rev",l:"Clearing review items",d:"Resolves flagged items once checked",f:()=>{if(!S.rev.length)return null;const r=S.rev.shift();return`Checked and resolved: ${r[0]}`}},
 {k:"rep",l:"Preparing reports",d:"Keeps month-end reports up to date",f:()=>`Prepared the ${pick(Object.keys(R))} report`}];
function apStep(){if(!S.ap.on)return;const on=TASKS.filter(t=>!S.ap.off[t.k]);let t,res=null;
 for(let n=0;n<on.length&&res==null;n++){t=on[AP.i++%on.length];try{res=t.f()}catch(e){res=null}}
 if(res==null){AP.t=setTimeout(apStep,8000);return}
 AP.busy=1;ACT.cur="Autopilot: "+t.l+"…";bubble();
 AP.t=setTimeout(()=>{AP.busy=0;ACT.cur=null;if(!S.ap.on){bubble();return}log("Autopilot",res);feedAdd("Autopilot",res);gtoast("Autopilot: "+res,t.imp);save();refresh();bubble();const g=SPEED[S.ap.speed];AP.t=setTimeout(apStep,rnd(g[0],g[1]))},1800)}
function setAP(on){S.ap.on=on?1:0;clearTimeout(AP.t);AP.busy=0;ACT.cur=null;feedAdd("Autopilot",on?"Autopilot is on":"Autopilot is paused");if(on)AP.t=setTimeout(apStep,1500);save();bubble();toast(on?"Autopilot is on":"Autopilot is paused")}
const apStatus=()=>`Autopilot is <b>${S.ap.on?"on":"off"}</b>. Pace: ${SPN[S.ap.speed]}. Notifications: ${TON[S.ap.toasts]}. ${TASKS.filter(t=>!S.ap.off[t.k]).length} of ${TASKS.length} tasks enabled.`;
function apCmd(t){const s=t.toLowerCase(),o=[],nt=/toast|notification|popup/.test(s);
 if(!nt&&/\b(stop|pause|disable|turn off|switch off|deactivate)\b/.test(s)){setAP(0)}
 else if(!nt&&/\b(enable|start|turn on|switch on|activate|resume)\b/.test(s)){setAP(1)}
 const sp=/relaxed|slow|calm/.test(s)?"rel":/\bactive\b|fast|busy/.test(s)?"act":/standard|normal/.test(s)?"std":null;if(sp){S.ap.speed=sp;o.push(`Pace set to ${SPN[sp]}.`)}
 if(nt){if(/(hide|mute|silence|disable|turn off|stop|no\b)/.test(s)){S.ap.toasts="off";o.push("Notifications are off. Activity still appears in the log and the ⚡ panel.")}
  else if(/important/.test(s)){S.ap.toasts="imp";o.push("You’ll only see notifications for important actions.")}
  else{S.ap.toasts="all";o.push("You’ll see a notification for every task.")}}
 save();bubble();const h=o.length?o.join(" ")+"<br>":"";
 say(h+apStatus(),{chips:[[S.ap.on?"Pause autopilot":"Turn on autopilot",S.ap.on?"Pause autopilot":"Turn on autopilot"],["Relaxed pace","Set autopilot pace to relaxed"],["Important notifications only","Show only important notifications"],["Hide notifications","Hide autopilot notifications"],["Open settings","@go:automations"]]})}
const apCard=()=>{const op=(o,v)=>Object.entries(o).map(([k,l])=>`<option value="${k}" ${String(v)==k?"selected":""}>${l}</option>`).join("");
 return`<div class="card mb-3"><div class="wh"><div><b>${ico("zap",16)} Autopilot</b><span>${S.ap.on?"On. Penny is working through your books in the background.":"Off. Turn it on to let Penny handle routine bookkeeping."}</span></div><div class="wa"><div class="form-check form-switch m-0"><input class="form-check-input" role="switch" type="checkbox" data-a="ap-on" ${S.ap.on?"checked":""} aria-label="Autopilot"></div></div></div>
 <div class="row g-3 mb-3"><div class="col-md-4"><label class="form-label w-100">Pace<select class="form-select" data-ap="speed">${op(SPN,S.ap.speed)}</select></label></div><div class="col-md-4"><label class="form-label w-100">Notifications<select class="form-select" data-ap="toasts">${op(TON,S.ap.toasts)}</select></label></div><div class="col-md-4"><label class="form-label w-100">Approval limit per bill<select class="form-select" data-ap="limit">${op({50000:"Up to ₹50,000",100000:"Up to ₹1,00,000",250000:"Up to ₹2,50,000"},S.ap.limit)}</select></label></div></div>
 <div class="ap-t">${TASKS.map(t=>`<label class="ap-r"><input class="form-check-input" type="checkbox" data-apt="${t.k}" ${S.ap.off[t.k]?"":"checked"}><span><b>${t.l}</b><small>${t.d}</small></span></label>`).join("")}</div>
 <p class="ap-n">Every action is recorded in the activity log. Autopilot only approves bills within your limit and never deletes anything. Bank transactions and receipts are sample inputs until a live bank feed is connected.</p></div>`};
function selfTest(){const snap=JSON.stringify({S,CASH}),res=[],t=(n,f)=>{let ok=0;try{ok=!!f()}catch(e){}res.push([n,ok])};
 t("Understands “in 5 minutes”",()=>{const w=parseWhen("in 5 minutes");return w.f=="once"&&w.ts>Date.now()});
 t("Understands “every monday at 10am”",()=>{const w=parseWhen("every monday at 10am");return w.f=="weekly"&&w.days[0]==1&&w.at=="10:00"});
 t("Works out the next daily run",()=>next({f:"daily",at:"09:00"})>Date.now());
 t("Penny reads “mark INV-1042 as paid”",()=>intent("Mark INV-1042 as paid").id=="markinv");
 t("Mark invoice paid adds cash",()=>{const i=S.inv.find(x=>x.s=="Overdue"),b=CASH;A.markinv.run({doc:i.n});return i.s=="Paid"&&CASH==b+i.a});
 t("Approve bills",()=>{S.bill.unshift({n:"BILL-T1",c:"Test",d:"",du:"",a:1000,s:"Open"});A.approve.run({max:5000});return S.bill[0].s=="Approved"});
 t("Pay approved bills lowers cash",()=>{const b=CASH;A.paybills.run();return S.bill[0].s=="Paid"&&CASH<b});
 t("Categorise bank feed",()=>{S.bank.unshift({d:"",t:"T",a:-1,k:"x",p:99,ok:0});A.categorise.run({mode:"90"});return S.bank[0].ok==1});
 t("Chase overdue invoices",()=>{S.inv.unshift({n:"INV-T1",c:"Test",d:"",du:"",a:1,s:"Overdue"});A.chase.run();return S.inv[0].rm==1});
 t("Create invoice",()=>{const n=S.inv.length;A.createinv.run({c:S.cust[0].c,a:5000});return S.inv.length==n+1});
 t("Create bill",()=>{const n=S.bill.length;A.newbill.run({c:S.ven[0].c,a:900,due:7});return S.bill.length==n+1});
 t("Add expense",()=>{const n=S.exp.length;A.newexp.run({n:"Test",cat:"Meals",a:100});return S.exp.length==n+1});
 t("Delete invoice",()=>{const n=S.inv.length;A.del.run({type:"inv",doc:S.inv[0].n});return S.inv.length==n-1});
 t("Builds a valid PDF",()=>buildPdf("Profit and loss").size>800);
 t("Scheduled reminder fires and switches off",()=>{const a=addAuto("remind",{msg:"test"},{f:"once",ts:Date.now()+9e5}),r=a.r;a.nx=Date.now()-1;tick();return a.r==r+1&&a.on==0});
 const o=JSON.parse(snap);Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,o.S);CASH=o.CASH;document.querySelectorAll(".rbn").forEach(e=>e.remove());
 const ok=res.filter(r=>r[1]).length;ACT.test={res,at:tnow()};save();bubble();render();toast(`Quick test: ${ok} of ${res.length} passed. Your data was restored.`)}
function bubble(){let e=$("#lv");if(!authed){if(e)e.hidden=true;return}
 if(!e){e=document.createElement("div");e.id="lv";document.body.appendChild(e)}e.hidden=false;
 const run=S.auto.filter(a=>a.on&&a.k&&a.k!="none"),n=run.length+(S.ap.on?1:0),nx=run.filter(a=>a.nx).sort((a,b)=>a.nx-b.nx)[0];
 let h=`<button class="lv-b ${ACT.cur?"busy":""}" data-a="lv" aria-expanded="${!!ACT.open}" aria-label="Automation activity, ${n} running">${ico("zap",20)}<span>${n}</span></button>`;
 if(ACT.open)h+=`<div class="lv-p" role="dialog" aria-label="Automation activity"><div class="lv-h"><b>Automation live</b><button class="icon-btn" data-a="lv" aria-label="Close">${ico("x",18)}</button></div>
 <div class="lv-now ${ACT.cur?"on":""}">${ACT.cur?`<i></i>Working on <b>${esc(ACT.cur)}</b>`:`Idle${nx?`. Next: <b>${esc(nx.n.slice(0,34))}</b> at ${fdt(nx.nx)}`:""}`}</div>
 <div class="lv-st"><div><b>${n}</b><span>running</span></div><div><b>${ACT.total}</b><span>tasks done</span></div><div><b>${S.ap.on?"On":"Off"}</b><span>autopilot</span></div></div>
 <div class="lv-sw"><span>Autopilot<small>${SPN[S.ap.speed]} pace · notifications: ${TON[S.ap.toasts]}</small></span><div class="form-check form-switch m-0"><input class="form-check-input" role="switch" type="checkbox" data-a="lv-ap" ${S.ap.on?"checked":""} aria-label="Autopilot"></div></div><button class="btn btn-link btn-sm p-0 mb-2" data-a="go:autopilot">Autopilot settings</button>
 
 ${ACT.test?`<div class="lv-t"><b>${ACT.test.res.filter(r=>r[1]).length} of ${ACT.test.res.length} passed at ${ACT.test.at}</b>${ACT.test.res.map(r=>`<div class="${r[1]?"ok":"bad"}">${r[1]?"Pass":"FAIL"} · ${r[0]}</div>`).join("")}</div>`:""}
 <h4>Running automations</h4>${run.map(a=>`<div class="lv-i"><span>${esc(a.n.slice(0,40))}</span><em>${a.nx?fdt(a.nx):""}</em></div>`).join("")||'<div class="lv-i"><span>None</span></div>'}
 <h4>Live activity</h4>${ACT.feed.map(f=>`<div class="lv-i"><span><small>${f.t} · ${f.src}</small>${esc(f.m)}</span></div>`).join("")||'<div class="lv-i"><span>Nothing yet. Turn on autopilot to watch it work.</span></div>'}</div>`;
 e.innerHTML=h}

/* ---------- boot ---------- */
const _r=window.render;
window.render=function(){_r();save();bubble();const c=$("#chat");if(c){c.scrollTop=c.scrollHeight;if(matchMedia("(min-width:768px)").matches&&!CH.typing){const i=$("#pi");if(i)i.focus()}if(PEND){const q=PEND;PEND=null;send(q)}}};
setInterval(tick,10000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
if(S.ap.on)AP.t=setTimeout(apStep,4000);setInterval(bubble,5000);tick();window.render();
})();
