{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
$('#root').innerHTML=$('#shell').innerHTML;
let LS=null;try{LS=window.localStorage;LS.getItem('x')}catch(e){LS=null}
const lsGet=(k,d)=>{try{const v=LS&&LS.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{LS&&LS.setItem(k,JSON.stringify(v))}catch(e){}};
/* Public project address + anon key: safe to ship — without a member's email and password they open nothing (row-level security). */
const CFG={url:'https://oqmvufrwgkgauwohoawc.supabase.co',anon:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xbXZ1ZnJ3Z2tnYXV3b2hvYXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNDc2MDMsImV4cCI6MjExMDgyMzYwM30.3GXx0I9kmFSZiNgFh-i1Qt3lwYkNAj8BJqBHJHtbyzU'};
let S=lsGet('ss-cache',{batches:[],moves:[],flags:[]});
let Q=lsGet('ss-queue',[]);
const U=Object.assign({client:'All',q:'',view:'batches',empty:false},lsGet('ss-ui',{}),{q:''});
const uid=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round(n*100)/100).toLocaleString('en-IN',{maximumFractionDigits:2});
const key=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dshow=d=>d?(+d.slice(8))+' '+MON[+d.slice(5,7)-1]+' '+d.slice(2,4):'';
const days=d=>d?Math.round((Date.parse(d)-Date.parse(today()))/864e5):null;
const effExp=b=>b.ext||b.exp;
const NAMES={in:'Received',use:'Used',exp:'Written off',adj:'Corrected'};
let C={};
function calc(){C={};for(const b of S.batches)C[b.id]={in:0,use:0,exp:0,adj:0};for(const m of S.moves)if(C[m.b])C[m.b][m.t]+=m.q;for(const b of S.batches){const c=C[b.id];c.close=Math.round((b.opening+c.in-c.use-c.exp+c.adj)*1000)/1000}}
const stock=b=>C[b.id].close;
function chip(b){const e=effExp(b);if(!e)return'<span class="chip s">no expiry</span>';const d=days(e);
 if(d<0)return`<span class="chip r">Expired ${-d}d ago</span>`;if(d<=30)return`<span class="chip a">${d}d left</span>`;if(d<=90)return`<span class="chip s">${d}d left</span>`;return''}
function clients(){return[...new Set(S.batches.map(b=>b.client))]}
function vis(){const q=key(U.q);return S.batches.filter(b=>(U.client=='All'||b.client==U.client)&&(!q||key([b.item,b.batch,b.supplier,b.base,b.code,b.client].join(' ')).includes(q)))}
function renderTop(){
 const live=S.batches.filter(b=>stock(b)>0),since=n=>{const d=new Date(Date.parse(today())-n*864e5).toISOString().slice(0,10);return d};
 const sum=a=>a.reduce((s,b)=>s+stock(b),0),w=since(7);
 const expd=live.filter(b=>effExp(b)&&days(effExp(b))<0),soon=live.filter(b=>{const d=days(effExp(b));return d!=null&&d>=0&&d<=30});
 const mv=t=>S.moves.filter(m=>m.t==t&&m.date>w).reduce((s,m)=>s+m.q,0);
 $('#figs').innerHTML=[[fmt(sum(live)),'kg','On hand'],[live.length,'','Live batches'],[fmt(sum(expd)),'kg','Expired, still in store',expd.length],[fmt(sum(soon)),'kg','Expiring in 30 days'],[fmt(mv('in')),'kg','Received, last 7 days'],[fmt(mv('use')),'kg','Used, last 7 days']]
  .map(([v,u,l,bad])=>`<div class="fig${bad?' bad':''}"><b>${v}<small>${u}</small></b><span>${l}</span></div>`).join('');
 $('#sub').textContent='Popular Essentials · Quality & Food Safety · '+dshow(today())+' · '+clients().length+' clients'+(S.lastSheet?' · Google Sheet synced '+new Date(S.lastSheet).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'');
 const al=[];
 const ex=expd.sort((a,b)=>stock(b)-stock(a)),exs=U.allx?ex:ex.slice(0,6);
 if(expd.length)al.push(`<div class="al red"><strong>Expired, still in stock</strong>${exs.map(b=>`<button class="pill" data-wo="${b.id}">${esc(b.item)} · ${esc(b.client)} · ${fmt(stock(b))} kg — write off</button>`).join('')}${ex.length>6?`<button class="x" data-allx="1">${U.allx?'show fewer':'+'+(ex.length-6)+' more'}</button>`:''}</div>`);
 if(soon.length)al.push(`<div class="al amb"><strong>Use these first</strong>${soon.sort((a,b)=>effExp(a).localeCompare(effExp(b))).map(b=>`<span class="pill">${esc(b.item)} · ${esc(b.client)} · ${fmt(stock(b))} kg · ${days(effExp(b))}d</span>`).join('')}</div>`);
 if(S.flags.length)al.push(`<details class="al"><summary>Check these from the old sheet (${S.flags.length})</summary><ul>${S.flags.map((f,i)=>`<li>${esc(f)} <button class="x" data-flag="${i}">done</button></li>`).join('')}</ul></details>`);
 $('#alerts').innerHTML=al.join('');
 const cl=['All',...clients()];
 $('#tabs').innerHTML=cl.map(c=>{const kg=sum(S.batches.filter(b=>(c=='All'||b.client==c)&&stock(b)>0));return`<button data-c="${esc(c)}" aria-pressed="${U.client==c}">${esc(c)}<small>${fmt(kg)} kg</small></button>`}).join('');
 $$('#views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v==U.view));
 $('#empty').checked=U.empty;$('#empty').parentElement.style.display=U.view=='batches'?'':'none';
}
function renderBatches(){
 const rows=U.empty?vis():vis().filter(b=>stock(b)>0);
 rows.sort((a,b)=>a.client.localeCompare(b.client)||key(a.item).localeCompare(key(b.item))||(effExp(a)||'9').localeCompare(effExp(b)||'9'));
 if(!rows.length)return CFG.url?'<div class="empty">No batches here. Use <b>Receive stock</b> to add one.</div>':'<div class="empty">Not signed in yet. Tap <b>Connection</b> above.</div>';
 const inp=(b,f,cls='',type='text')=>`<input class="${cls}" type="${type}" data-b="${b.id}" data-f="${f}" value="${esc(b[f])}" aria-label="${f}"${b.src?' readonly title="From the Google Sheet — change it there"':''}>`;
 return`<table><thead><tr>${U.client=='All'?'<th>Client</th>':''}<th>Seasoning</th><th>Base</th><th>Supplier</th><th>Product code</th><th>Batch</th><th>MFG</th><th>EXP</th><th></th><th class="n">Opening</th><th class="n">In</th><th class="n">Used</th><th class="n">Written off</th><th class="n">Closing</th><th>Quick</th><th>Remark</th></tr></thead><tbody>${rows.map(b=>{const c=C[b.id];return`<tr class="${c.close>0?'':'dead'}">${U.client=='All'?`<td>${esc(b.client)}</td>`:''}<td>${inp(b,'item','w')}</td><td>${inp(b,'base')}</td><td>${inp(b,'supplier')}</td><td>${inp(b,'code')}</td><td>${inp(b,'batch')}</td><td>${inp(b,'mfg','','date')}</td><td>${inp(b,'exp','','date')}</td><td>${chip(b)}</td><td class="n">${inp(b,'opening','','number')}</td><td class="n">${c.in?fmt(c.in):''}</td><td class="n">${c.use?fmt(c.use):''}</td><td class="n">${c.exp?fmt(c.exp):''}</td><td class="n c">${fmt(c.close)}</td><td><div class="rb"><button title="Receive into this batch" data-row="in" data-id="${b.id}">+</button><button title="Use in production" data-row="use" data-id="${b.id}">−</button><button title="Write off" data-row="exp" data-id="${b.id}">×</button></div></td><td>${inp(b,'remark')}</td></tr>`}).join('')}</tbody></table>`}
const ikey=(c,i)=>c+'|'+key(i);
function summary(list){const IT=S.items||{},g={};
 for(const b of list){const s=b.grp&&IT[b.grp];const k=s?b.grp:ikey(b.client,b.item);
  (g[k]??=(s?{id:k,item:s.item,client:s.client,sort:+s.sort||9999,inSum:true,bs:[]}:{id:k,item:b.item,client:b.client,sort:1e6,inSum:false,bs:[]})).bs.push(b)}
 if(U.client=='All'&&!U.q)for(const[id,s]of Object.entries(IT))if(s.sort!=null&&s.sort!==''&&!g[id]&&id.startsWith('sum:'))g[id]={id,item:s.item,client:s.client,sort:+s.sort,inSum:true,bs:[],only:+s.sq||0};
 const isExp=b=>effExp(b)&&days(effExp(b))<0;
 return Object.values(g).map(x=>{const live=x.bs.filter(b=>stock(b)>0).sort((a,b)=>(effExp(a)||'9').localeCompare(effExp(b)||'9')),it=IT[x.id]||{};
  const kg=live.reduce((s,b)=>s+stock(b),0)+(x.only||0),bad=live.filter(isExp).reduce((s,b)=>s+stock(b),0),good=kg-bad;
  const ln=Object.entries(S.ps||{}).find(([,s])=>s.stock_grp===x.id&&s.pct>0);
  const fg=ln?good/ln[1].pct:it.fg!==''&&it.fg!=null?+it.fg:(it.pct?good*100/it.pct:null);
  return{...x,live,kg,bad,good,fg,fgAuto:ln?ln[0]+' · '+Math.round(ln[1].pct*10000)/100+'%':'',fgTyped:!ln&&it.fg!==''&&it.fg!=null,remark:it.remark||'',auto:bad>0?(good>0?fmt(bad)+' kg expired':'Expired'):''}})
  .sort((a,b)=>a.sort-b.sort||a.client.localeCompare(b.client)||key(a.item).localeCompare(key(b.item)))}
function renderItems(){
 const rows=summary(vis());if(!rows.length)return'<div class="empty">Nothing matches.</div>';
 const att=r=>`data-it="${esc(r.id)}" data-cl="${esc(r.client)}" data-nm="${esc(r.item)}"`;
 const grp=r=>{const lines=r.live.length?r.live:[null];
  return lines.map((b,k)=>`<tr class="${r.kg>0?'':'dead'}">${k==0?`<td class="n">${r.inSum?r.sort:''}</td><td><button class="lnk" data-item="${esc(r.item)}" data-cl="${esc(r.bs[0]?.client||"")}">${esc(r.item)}</button></td><td>${esc(r.client)}</td>`:'<td></td><td></td><td></td>'}
   ${b?`<td>${esc(b.batch)||'<span class="mut">no batch no.</span>'}</td><td>${dshow(effExp(b))} ${chip(b)}</td><td class="n">${fmt(stock(b))}</td>`:(r.only?`<td colspan="2" class="mut">Only on the Summary sheet — no batch on any stock sheet</td><td class="n">${fmt(r.only)}</td>`:'<td colspan="3" class="mut">No stock</td>')}<td></td><td></td></tr>`).join('')
  +`<tr class="tot"><td></td><td colspan="2">Total – ${esc(r.item)}</td><td>${r.live.length} batch${r.live.length==1?'':'es'}</td><td></td><td class="n c">${fmt(r.kg)}</td>
   <td class="n">${r.fgAuto?`<b>${fmt(Math.round(r.fg))}</b><br><span class="mut" title="Usable stock ÷ seasoning %">${esc(r.fgAuto)}</span>`:`<input type="number" step="1" min="0" ${att(r)} data-f="fg" value="${r.fgTyped?r.fg:''}" placeholder="${r.fg!=null?fmt(r.fg):'–'}" aria-label="FG Qty">`}</td>
   <td>${r.auto?`<span class="chip ${r.good>0?'a':'r'}">${r.auto}</span> `:''}<input ${att(r)} data-f="remark" value="${esc(r.remark)}" placeholder="Remark" aria-label="Remark"></td></tr>`};
 const inS=rows.filter(r=>r.inSum),oth=rows.filter(r=>!r.inSum),sum=(a,f)=>a.reduce((s,r)=>s+(f(r)||0),0);
 const gt=(label,a,cls)=>`<tr class="${cls}"><td></td><td colspan="2">${label}</td><td></td><td></td><td class="n c">${fmt(sum(a,r=>r.kg))}</td><td class="n c">${fmt(sum(a,r=>r.fg))}</td><td></td></tr>`;
 return`<table class="sumt"><thead><tr><th class="n">Sl No</th><th>Name</th><th>Client</th><th>Batch</th><th>EXP</th><th class="n">Qty (kg)</th><th class="n">FG Qty (kg)</th><th>Remarks</th></tr></thead><tbody>
  ${inS.map(grp).join('')}${inS.length?gt('Grand total – Summary items',inS,'grand'):''}
  ${oth.length?`<tr class="sec"><td colspan="8">Other stock — not on your Summary</td></tr>${oth.map(grp).join('')}${gt('Total – other stock',oth,'grand')}`:''}
  ${inS.length&&oth.length?gt('All stock',rows,'grand all'):''}</tbody></table>`}
function renderLog(){
 const ids=new Set(vis().map(b=>b.id)),B=Object.fromEntries(S.batches.map(b=>[b.id,b]));
 const ms=S.moves.filter(m=>ids.has(m.b)).sort((a,b)=>b.date.localeCompare(a.date)||(b.ca||'').localeCompare(a.ca||'')).slice(0,300);
 if(!ms.length)return'<div class="empty">No movements yet. Every receipt, use and write-off will be listed here.</div>';
 return`<table><thead><tr><th>Date</th><th>Type</th><th>Client</th><th>Seasoning</th><th>Batch</th><th>For client</th><th class="n">Qty (kg)</th><th>Note</th><th></th></tr></thead><tbody>${ms.map(m=>{const b=B[m.b];return`<tr><td>${dshow(m.date)}</td><td><span class="t ${m.t}">${NAMES[m.t]}</span></td><td>${esc(b.client)}</td><td>${esc(b.item)}</td><td>${esc(b.batch)}</td><td>${m.t=='use'?`<b>${esc(m.fc||b.client)}</b>`:''}</td><td class="n c">${m.t=='use'||m.t=='exp'?'−':m.q>0?'+':''}${fmt(m.q)}</td><td>${esc(m.note)}</td><td><button class="x" data-del="${m.id}">delete</button></td></tr>`}).join('')}</tbody></table>`}
function render(){calc();renderTop();$('#view').innerHTML=U.view=='proj'?renderProj():U.view=='items'?renderItems():U.view=='log'?renderLog():renderBatches();try{const h=U.view=='proj'?'#projections':'';if(location.hash!==h)history.replaceState(null,'',h||location.pathname)}catch(e){}try{LS&&LS.setItem('ss-ui',JSON.stringify({client:U.client,view:U.view,empty:U.empty}))}catch(e){}}
/* sync with Supabase: every change is an op with its own id, queued in this browser until the database confirms it */
let busy=false,fails=0,retryT=null,lastSync=null,offline=false,sb=null,live=null,who='';
function status(){const el=$('#save');el.className='';
 if(!CFG.url){el.textContent='Not connected';el.className='warn';return}
 if(Q.length){el.textContent=`${Q.length} change${Q.length>1?'s':''} waiting to sync${fails?' — retrying':''}`;el.className='warn';return}
 if(offline){el.textContent='Offline — showing last saved copy';el.className='warn';return}
 el.textContent=lastSync?'Saved · '+lastSync.toTimeString().slice(0,5):'Connecting…'}
function apply(op){const p=op.p;
 if(op.a=='addMove'){if(p.batch&&!S.batches.some(b=>b.id==p.batch.id))S.batches.push({...p.batch});if(!S.moves.some(m=>m.id==p.move.id))S.moves.push({...p.move})}
 else if(op.a=='deleteMove')S.moves=S.moves.filter(m=>m.id!=p.id);
 else if(op.a=='updateBatch'){const b=S.batches.find(x=>x.id==p.id);if(b)b[p.f]=p.v}
 else if(op.a=='setItem'){S.items=S.items||{};const it=S.items[p.id]=S.items[p.id]||{client:p.client,item:p.item,pct:'',fg:'',remark:''};it[p.f]=p.v}
 else if(op.a=='setSeas'){S.ps=S.ps||{};(S.ps[p.name]??={pct:null,stock_grp:''})[p.f]=p.v}
 else if(op.a=='setSku'){const s=(S.skus||[]).find(x=>x.id==p.id);if(s)s[p.f]=p.v}
 else if(op.a=='setPlan'){S.plan=S.plan||{};S.plan[p.sku+'|'+p.month]=+p.v||0}
 else if(op.a=='importProj'){S.ps=S.ps||{};S.skus=S.skus||[];S.plan=S.plan||{};for(const s of p.seas)S.ps[s.name]={pct:s.pct,stock_grp:s.stock_grp||''};for(const s of p.skus){const i=S.skus.findIndex(x=>x.id==s.id);if(i>=0)S.skus[i]={...S.skus[i],...s};else S.skus.push({...s})}for(const x of p.plan)S.plan[x.sku_id+'|'+x.month]=x.packets}
 else if(op.a=='dismissFlag')S.flags=S.flags.filter(f=>f!=p.text)}
function act(a,p){if(!CFG.url){showSetup();return false}const op={id:uid(),a,p};apply(op);Q.push(op);lsSet('ss-queue',Q);lsSet('ss-cache',S);setTimeout(render);flush();return true}
function client(){if(!CFG.url||!window.supabase)return null;if(!sb)sb=window.supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'ss-auth'}});return sb}
const nz=v=>v===''||v==null?null:v,ez=v=>v==null?'':String(v);
function chk(r){if(r&&r.error){const c=String(r.error.code||''),msg=r.error.message||'error',e=new Error(msg);
 e.fatal=c=='PGRST301'||r.status==401||/jwt|not authenticated/i.test(msg);e.perm=c=='42501'||/permission denied|row-level security/i.test(msg);
 e.drop=!e.fatal&&!e.perm&&/^(22|23)/.test(c);throw e}return r.data}
async function fetchAll(t,f){let out=[],from=0;for(;;){let q=client().from(t).select('*').order(t=='flags'?'text':t=='p_seasonings'?'name':t=='p_plan'?'sku_id':'id').range(from,from+999);if(f)q=f(q);const d=chk(await q)||[];out=out.concat(d);if(d.length<1000)return out;from+=1000}}
const toRow=b=>({id:b.id,grp:b.grp||'',client:b.client,item:b.item,base:b.base||'',supplier:b.supplier||'',code:b.code||'',batch:b.batch||'',mfg:nz(b.mfg),exp:nz(b.exp),ext:nz(b.ext),opening:+b.opening||0,remark:b.remark||''});
const moveRow=m=>({id:m.id,date:m.date,batch_id:m.b,type:m.t,qty:+m.q,note:m.note||'',...(m.fc?{for_client:m.fc}:{}),deleted:false,deleted_at:null});
const API={
 async all(){const[b,m,f,it,ps,sk,pl,sl]=await Promise.all([fetchAll('batches'),fetchAll('movements',q=>q.eq('deleted',false)),fetchAll('flags',q=>q.eq('done',false)),fetchAll('items').catch(()=>[]),fetchAll('p_seasonings').catch(()=>[]),fetchAll('p_skus').catch(()=>[]),fetchAll('p_plan').catch(()=>[]),client().from('sync_log').select('ran_at').order('id',{ascending:false}).limit(1).then(r=>r.data||[],()=>[])]);
  return{lastSheet:sl[0]?.ran_at||'',batches:b.map(x=>({...toRow(x),src:!!x.src_key,mfg:ez(x.mfg),exp:ez(x.exp),ext:ez(x.ext)})),moves:m.map(x=>({id:x.id,date:x.date,b:x.batch_id,t:x.type,q:+x.qty,note:x.note||'',fc:x.for_client||'',ca:x.created_at||''})),flags:f.map(x=>x.text),items:Object.fromEntries(it.map(x=>[x.id,{client:x.client,item:x.item,pct:x.pct==null?'':+x.pct,fg:x.fg==null?'':+x.fg,remark:x.remark||'',sort:x.sort,sq:x.sheet_qty==null?'':+x.sheet_qty}])),ps:Object.fromEntries(ps.map(x=>[x.name,{pct:x.pct==null?null:+x.pct,stock_grp:x.stock_grp||''}])),skus:sk.map(x=>({id:x.id,item_code:x.item_code,name:x.name,client:x.client,pack_kg:x.pack_kg==null?null:+x.pack_kg,seasonings:x.seasonings||[],sort:x.sort})),plan:Object.fromEntries(pl.map(x=>[x.sku_id+'|'+x.month,+x.packets]))}},
 async addMove(p){const c=client();if(p.batch)chk(await c.from('batches').upsert(toRow(p.batch),{onConflict:'id',ignoreDuplicates:true}));chk(await c.from('movements').upsert(moveRow(p.move),{onConflict:'id'}))},
 async deleteMove(p){chk(await client().from('movements').update({deleted:true,deleted_at:new Date().toISOString()}).eq('id',p.id))},
 async updateBatch(p){const v=['mfg','exp','ext'].includes(p.f)?nz(p.v):p.f=='opening'?(+p.v||0):(p.v??'');chk(await client().from('batches').update({[p.f]:v}).eq('id',p.id))},
 async setItem(p){const v=(p.f=='pct'||p.f=='fg')?(p.v===''||p.v==null?null:+p.v):(p.v||'');chk(await client().from('items').upsert({id:p.id,client:p.client,item:p.item,[p.f]:v,updated_at:new Date().toISOString()},{onConflict:'id'}))},
 async setSeas(p){chk(await client().from('p_seasonings').upsert({name:p.name,[p.f]:p.v,updated_at:new Date().toISOString()},{onConflict:'name'}))},
 async setSku(p){chk(await client().from('p_skus').update({[p.f]:p.v,updated_at:new Date().toISOString()}).eq('id',p.id))},
 async setPlan(p){chk(await client().from('p_plan').upsert({sku_id:p.sku,month:p.month,packets:+p.v||0,updated_at:new Date().toISOString()},{onConflict:'sku_id,month'}))},
 async importProj(p){const c=client(),put=async(t,rows,on)=>{for(let i=0;i<rows.length;i+=500)chk(await c.from(t).upsert(rows.slice(i,i+500),{onConflict:on}))};
  await put('p_seasonings',p.seas.map(s=>({name:s.name,pct:s.pct,stock_grp:s.stock_grp||''})),'name');
  await put('p_skus',p.skus.map(s=>({id:s.id,item_code:s.item_code||'',name:s.name,client:s.client||'',pack_kg:s.pack_kg||null,seasonings:s.seasonings,sort:s.sort})),'id');
  await put('p_plan',p.plan.map(x=>({sku_id:x.sku_id,month:x.month,packets:x.packets})),'sku_id,month')},
 async dismissFlag(p){chk(await client().from('flags').update({done:true}).eq('text',p.text))},
 async importAll(p){const c=client(),r=await c.from('batches').select('id',{count:'exact',head:true});chk(r);
  if(r.count>0)throw new Error('The database already has batches — import is only for an empty database');
  const put=async(t,rows,opt)=>{for(let i=0;i<rows.length;i+=500)chk(await c.from(t).upsert(rows.slice(i,i+500),opt))};
  await put('batches',p.batches.map(toRow),{onConflict:'id'});
  await put('movements',p.moves.map(moveRow),{onConflict:'id'});
  await put('flags',p.flags.map(t=>({text:t,done:false})),{onConflict:'text',ignoreDuplicates:true});
  if(p.items&&p.items.length)await put('items',p.items.map(x=>({id:x.id,client:x.client,item:x.item,fg:x.fg===''||x.fg==null?null:+x.fg,pct:x.pct||null,remark:x.remark||'',sort:x.sort??null})),{onConflict:'id'});
  return{imported:{batches:p.batches.length,moves:p.moves.length,flags:p.flags.length}}}};
async function call(a,p){if(!client()){const e=new Error(window.supabase?'Not connected':'Could not load the database library — check your connection');e.fatal=!!window.supabase;throw e}return API[a](p)}
async function flush(){if(busy||!CFG.url)return;busy=true;status();
 try{while(Q.length){try{await call(Q[0].a,Q[0].p)}catch(e){if(!e.drop)throw e;toast('The database refused a change: '+e.message)}Q.shift();lsSet('ss-queue',Q);fails=0;offline=false}
  busy=false;await pull(true)}
 catch(e){busy=false;fails++;if(e.fatal){showSetup('Please sign in again.')}else{offline=true;clearTimeout(retryT);retryT=setTimeout(flush,Math.min(60000,2000*2**fails))}}
 status()}
async function pull(force){if(!CFG.url||busy)return;if(Q.length&&!force)return flush();busy=true;
 try{const j=await call('all',{});S=j;Q.forEach(apply);lsSet('ss-cache',S);lastSync=new Date();offline=false;render()}
 catch(e){if(e.fatal)showSetup('Please sign in again.');else if(e.perm)showSetup('Signed in, but the database is missing permissions: '+e.message+'. Run the grant SQL in Supabase, then tap Sign in.');else offline=true}
 busy=false;status()}
let liveT;
function goLive(){const c=client();if(!c||live)return;try{live=c.channel('stock').on('postgres_changes',{event:'*',schema:'public'},()=>{clearTimeout(liveT);liveT=setTimeout(()=>Q.length?flush():pull(),700)}).subscribe()}catch(e){}}
setInterval(()=>{if(document.visibilityState=='visible')Q.length?flush():pull()},60000);
addEventListener('focus',()=>pull());addEventListener('online',()=>flush());
/* connection + sign-in */
const SF=$('#sf');
async function showSetup(msg){SF.email.value=SF.email.value||lsGet('ss-email','');$('#smsg').className=msg&&!/^Signed in/.test(msg)?'bad':'';$('#smsg').textContent=msg||'';
 let email='';try{const c=client();if(c){const{data}=await c.auth.getSession();email=data.session?.user?.email||''}}catch(e){}
 $('#who').textContent=email?'Signed in as '+email:'';$('#signout').hidden=!email;
 $('#imp').hidden=!(email&&!S.batches.length&&!S.lastSheet);$('#setup').hidden=false}
SF.addEventListener('submit',async e=>{e.preventDefault();const email=SF.email.value.trim(),pw=SF.pw.value;
 const msg=(t,bad)=>{$('#smsg').className=bad?'bad':'';$('#smsg').textContent=t};
 if(!window.supabase)return msg('Could not load the database library — check your internet connection.',1);
 msg('Signing in…');lsSet('ss-email',email);
 try{const r=await client().auth.signInWithPassword({email,password:pw});if(r.error)throw r.error;
  SF.pw.value='';const j=await call('all',{});S=j;Q.forEach(apply);lsSet('ss-cache',S);lastSync=new Date();render();status();goLive();
  $('#who').textContent='Signed in as '+email;$('#signout').hidden=false;
  if(!S.batches.length){msg(S.lastSheet?'Signed in.':'Signed in. No stock yet — it arrives with the first Google Sheet sync.');if(!S.lastSheet)$('#imp').hidden=false;if(S.lastSheet)setTimeout(()=>$('#setup').hidden=true,900)}
  else{msg(`Signed in — ${S.batches.length} batches loaded.`);setTimeout(()=>$('#setup').hidden=true,900)}flush()}
 catch(err){msg(/invalid login/i.test(err.message||'')?'Wrong email or password.':err.perm?'Signed in, but the database is missing permissions ('+err.message+'). Run the grant SQL in Supabase, then tap Sign in again.':'Could not connect: '+(err.message||err),1)}});
$('#impf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#smsg').className='';$('#smsg').textContent='Importing…';
 try{const d=JSON.parse(await f.text());if(!Array.isArray(d.batches))throw new Error('Not a stock file');const j=await call('importAll',{batches:d.batches,moves:d.moves||[],flags:d.flags||[],items:d.items||[]});
  $('#smsg').textContent=`Imported ${j.imported.batches} batches and ${j.imported.moves} movements.`;$('#imp').hidden=true;await pull(true);setTimeout(()=>$('#setup').hidden=true,1200)}
 catch(err){$('#smsg').className='bad';$('#smsg').textContent='Import failed: '+err.message}finally{e.target.value=''}};
$('#sx').onclick=()=>$('#setup').hidden=true;
$('#cfg').onclick=()=>showSetup();
$('#signout').onclick=async()=>{if(Q.length&&$('#signout').textContent!='Unsynced changes will be lost — tap again'){$('#signout').textContent='Unsynced changes will be lost — tap again';return}
 try{await client()?.auth.signOut()}catch(e){}['ss-cache','ss-queue','ss-auth','ss-email'].forEach(k=>{try{LS&&LS.removeItem(k)}catch(e){}});
 S={batches:[],moves:[],flags:[]};Q=[];live=null;render();status();$('#signout').textContent='Sign out';showSetup('Signed out. This browser no longer holds any stock data.')};
/* form */
const F=$('#f');let ft='in';
const nid=()=>uid();
function fillLists(){$('#dl-c').innerHTML=clients().map(c=>`<option value="${esc(c)}">`).join('');
 const c=F.client.value;$('#dl-i').innerHTML=[...new Set(S.batches.filter(b=>!c||b.client==c).map(b=>b.item))].map(i=>`<option value="${esc(i)}">`).join('');
 $('#dl-s').innerHTML=[...new Set(S.batches.map(b=>b.supplier).filter(Boolean))].map(i=>`<option value="${esc(i)}">`).join('')}
function fillBatches(keep){const c=F.client.value,i=key(F.itm.value);
 const bs=S.batches.filter(b=>(!c||b.client==c)&&(!i||key(b.item)==i)&&(ft=='adj'||stock(b)>0||b.id==keep)).sort((a,b)=>(effExp(a)||'9').localeCompare(effExp(b)||'9'));
 F.b.innerHTML=bs.length?bs.map(b=>`<option value="${b.id}">${esc(i?'':b.item+' · ')}${esc(b.batch||'no batch no.')} · exp ${dshow(effExp(b))||'—'} · ${fmt(stock(b))} kg${days(effExp(b))<0?' · EXPIRED':''}</option>`).join(''):'<option value="">No batch with stock — check client / seasoning</option>';
 if(keep&&bs.some(b=>b.id==keep))F.b.value=keep;
 else if(ft=='use'){const g=bs.find(b=>!(days(effExp(b))<0));if(g)F.b.value=g.id}
 else if(ft=='exp'){const g=bs.find(b=>days(effExp(b))<0);if(g)F.b.value=g.id}
 hint()}
function hint(){const h=$('#fhint'),b=S.batches.find(x=>x.id==F.b.value),q=+F.q.value;h.className='';if(ft=='use'&&b&&!F.fc.dataset.touched)F.fc.value=b.client;
 if(ft=='in'){const m=S.batches.find(x=>x.client==F.client.value&&key(x.item)==key(F.itm.value)&&F.batch.value&&key(x.batch)==key(F.batch.value));h.textContent=m?`Batch exists — this adds to it (now ${fmt(stock(m))} kg).`:F.itm.value?'Creates a new batch.':'';return}
 if(!b){h.textContent='';return}
 if(ft=='adj'){h.textContent=`Now ${fmt(stock(b))} kg. Enter + to add, − to reduce.`;return}
 if(q>stock(b)+1e-9){h.className='bad';h.textContent=`Only ${fmt(stock(b))} kg in this batch.`}else h.textContent=q?`Leaves ${fmt(stock(b)-q)} kg in this batch.`:`${fmt(stock(b))} kg available.`;
 if(ft=='use'&&days(effExp(b))<0){h.className='bad';h.textContent='This batch is expired. '+h.textContent}}
function setType(t){ft=t;$('#ffc').hidden=t!='use';$('#ftitle').textContent={in:'Receive stock',use:'Use in production',exp:'Write off / expired',adj:'Correct a count'}[t];
 $$('#ftype button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t==t));
 $('#fnew').hidden=t!='in';$('#fpick').hidden=t=='in';$('#fall').hidden=t=='in'||t=='adj';
 F.q.min=t=='adj'?'':'0.001';F.q.placeholder=t=='adj'?'e.g. -2.5':'';
 F.note.placeholder={in:'e.g. Invoice / GRN no.',use:'e.g. Line 2 – peri peri makhana',exp:'e.g. Expired, disposed',adj:'e.g. Physical count'}[t];
 F.batch.required=false;if(t!='in')fillBatches(F.b.value);else hint()}
function open(t,id){F.reset();delete F.fc.dataset.touched;F.date.value=today();if(U.client!='All')F.client.value=U.client;
 const b=id&&S.batches.find(x=>x.id==id);if(b){F.client.value=b.client;F.itm.value=b.item;if(t=='in')['batch','code','supplier','base','mfg','exp'].forEach(f=>F[f].value=b[f]||'')}
 fillLists();setType(t);if(b&&t!='in')fillBatches(id);$('#sheet').hidden=false;setTimeout(()=>(b?F.q:F.client.value?F.itm:F.client).focus(),30)}
const close=()=>$('#sheet').hidden=true;
let undoT;
function toast(msg,undo){const t=$('#toast');t.innerHTML=esc(msg)+(undo?' <button>Undo</button>':'');t.hidden=false;clearTimeout(undoT);
 if(undo)t.querySelector('button').onclick=()=>{undo();t.hidden=true};undoT=setTimeout(()=>t.hidden=true,6000)}
F.addEventListener('submit',e=>{e.preventDefault();const q=Math.round(+F.q.value*1000)/1000,note=F.note.value.trim(),date=F.date.value||today();
 if(!q||(ft!='adj'&&q<0)){$('#fhint').className='bad';$('#fhint').textContent='Enter a quantity.';return}
 let b,created=false;
 if(ft=='in'){const cl=F.client.value.trim(),it=F.itm.value.trim();if(!cl||!it){$('#fhint').className='bad';$('#fhint').textContent='Client and seasoning are needed.';return}
  b=S.batches.find(x=>x.client==cl&&key(x.item)==key(it)&&F.batch.value&&key(x.batch)==key(F.batch.value));
  if(!b){const prev=S.batches.filter(x=>x.client==cl&&key(x.item)==key(it)&&x.grp).pop();b={id:nid(),grp:prev?prev.grp:'',client:cl,item:it,base:F.base.value.trim(),supplier:F.supplier.value.trim(),code:F.code.value.trim(),batch:F.batch.value.trim(),mfg:F.mfg.value,exp:F.exp.value,ext:'',opening:0,remark:''};created=true}}
 else{b=S.batches.find(x=>x.id==F.b.value);if(!b){$('#fhint').className='bad';$('#fhint').textContent='Pick a batch.';return}
  if(ft!='adj'&&q>stock(b)+1e-9){hint();return}}
 const fc=ft=='use'?F.fc.value.trim():'';if(ft=='use'&&!fc){$('#fhint').className='bad';$('#fhint').textContent='Which client is this production for?';return}
 const m={id:nid(),date,b:b.id,t:ft,q,note,ca:new Date().toISOString(),...(fc?{fc}:{})};if(!act('addMove',created?{move:m,batch:b}:{move:m}))return;close();
 toast(`${NAMES[ft]} ${fmt(Math.abs(q))} kg · ${b.item}${b.batch?' ('+b.batch+')':''}`,()=>act('deleteMove',{id:m.id}))});
F.addEventListener('input',e=>{const n=e.target.name;if(n=='fc'){F.fc.dataset.touched=1;return}if(n=='client'){fillLists();if(ft!='in')fillBatches()}else if(n=='itm'){if(ft!='in')fillBatches();else{const p=S.batches.filter(b=>b.client==F.client.value&&key(b.item)==key(F.itm.value)).pop();if(p)['code','supplier','base'].forEach(f=>{if(!F[f].value)F[f].value=p[f]||''});hint()}}else hint()});
$('#ftype').onclick=e=>{const t=e.target.closest('[data-t]');if(t)setType(t.dataset.t)};
$('#fall').onclick=()=>{const b=S.batches.find(x=>x.id==F.b.value);if(b){F.q.value=stock(b);hint()}};
$('#fx').onclick=close;$('#sheet').onclick=e=>{if(e.target.id=='sheet')close()};
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!$('#sheet').hidden)close()});
/* ---------- Projections: seasoning needed for the production plan ---------- */
const MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const r1=v=>Math.round(v*10)/10;
const mlabel=m=>MONS[+m.slice(5,7)-1]+' '+m.slice(2,4);
const pctS=p=>p==null||p===''?'':String(Math.round(p*10000)/100);
const stopw=new Set(['seasoning','cl','tropical','aranyakam','the','and','of']);
const toks=s=>new Set(key(s).replace(/[^a-z0-9 ]/g,' ').split(' ').filter(w=>w&&!stopw.has(w)));
const near=(a,b)=>{if(a===b)return true;if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++}else{if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++}}}return d+(a.length-i)+(b.length-j)<=1};
const sameToks=(A,B)=>A.size&&A.size===B.size&&[...A].every(a=>[...B].some(b=>near(a,b)));
/** best Summary line for a seasoning: same words (typos allowed), same client */
function autoLink(name,client){const A=toks(name),c=key(client);
 const hit=Object.entries(S.items||{}).find(([id,s])=>s.sort!=null&&s.sort!==''&&key(s.client).startsWith(c)&&sameToks(A,toks(s.item)));
 return hit?hit[0]:''}
function projData(){
 const P=S.ps||{},cl=key(U.client),skus=(S.skus||[]).filter(s=>U.client=='All'||key(s.client)===cl||key(s.client).startsWith(cl+' ')).sort((a,b)=>(a.sort??999)-(b.sort??999)||a.id.localeCompare(b.id));
 const months=[...new Set(Object.keys(S.plan||{}).map(k=>k.split('|')[1]))].sort();
 const sum=Object.fromEntries(summary(S.batches).map(r=>[r.id,r]));
 const need={};for(const sk of skus)for(const n of sk.seasonings||[]){const pc=P[n]?.pct;if(!pc)continue;need[n]??={};
  for(const m of months){const pk=+(S.plan[sk.id+'|'+m]||0);need[n][m]=(need[n][m]||0)+pk*(+sk.pack_kg||0)*pc}}
 const names=[...new Set([...(U.client=='All'?Object.keys(P):[]),...skus.flatMap(s=>s.seasonings||[])])].sort((a,b)=>{const ta=months.reduce((s,m)=>s+(need[a]?.[m]||0),0),tb=months.reduce((s,m)=>s+(need[b]?.[m]||0),0);return tb-ta||a.localeCompare(b)});
 const stockOf=n=>{const g=P[n]?.stock_grp;return g&&sum[g]?sum[g].good:null};
 return{P,skus,months,need,names,stockOf,sum}}
function renderProj(){
 const{P,skus,months,need,names,stockOf}=projData();
 const imp=`<div class="pbar"><label class="ghostd">Import projections (.xlsx)<input type="file" id="pimp" accept=".xlsx,.xls" hidden></label><span class="mut">Same layout as “Noice Projections”: Working, Calculation and Seasoning Per Kg sheets. Nothing from the file is stored in the website code.</span></div>${PI?`<div class="al amb pprev"><strong>Ready to import</strong> ${PI.skus.length} products, ${PI.seas.length} seasonings, ${PI.months.length} months (${mlabel(PI.months[0])} – ${mlabel(PI.months[PI.months.length-1])}). Planned packets for these products and months will be replaced. <button class="pill" id="pgo">Import</button> <button class="x" id="pno">Cancel</button></div>`:''}`;
 if(!skus.length)return imp+(U.client!='All'&&(S.skus||[]).length?`<div class="empty">No projections for <b>${esc(U.client)}</b> yet. Projections so far are for: ${esc([...new Set(S.skus.map(s=>s.client||'—'))].join(', '))}. Import a projections file for ${esc(U.client)} to see it here.</div>`:'<div class="empty">No projections yet. Import your projections file to see how much seasoning the plan needs, month by month, against what is in stock.</div>');
 const sopt=(cur)=>`<option value="">— not linked —</option>`+Object.entries(S.items||{}).filter(([,s])=>s.sort!=null&&s.sort!=='').sort((a,b)=>a[1].sort-b[1].sort).map(([id,s])=>`<option value="${esc(id)}"${id===cur?' selected':''}>${esc(s.item)} · ${esc(s.client)}</option>`).join('');
 // 1. need vs stock
 const cur=today().slice(0,8)+'01',ahead=months.filter(m=>m>=cur);
 const rows1=names.filter(n=>need[n]||P[n]).map(n=>{const st=stockOf(n),pc=P[n]?.pct;let cum=0,out='';
  const cells=months.map(m=>{const v=need[n]?.[m]||0;if(m<cur)return`<td class="n past">${v?fmt(r1(v)):''}</td>`;cum+=v;const short=st!=null&&cum>st+1e-9;if(short&&!out)out=m;return`<td class="n ${v?(st==null?'':short?'pshort':'pok'):''}">${v?fmt(r1(v)):''}</td>`}).join('');
  const left=st!=null?st-cum:null;
  return`<tr><td><b>${esc(n)}</b></td><td class="n">${pc?pctS(pc)+'%':'<span class="mut">set %</span>'}</td><td class="n c">${st!=null?fmt(st):'<span class="mut">link stock ↓</span>'}</td>${cells}<td class="n c">${fmt(r1(cum))}</td><td class="n c ${left==null?'':left<0?'neg':'pos'}">${left==null?'':(left<0?'−':'')+fmt(r1(Math.abs(left)))}</td><td>${st==null?'':out?`<span class="chip r">Short from ${mlabel(out)}</span>`:'<span class="chip s">Covers plan</span>'}</td></tr>`}).join('');
 const t1=`<h3 class="ph">Seasoning needed vs usable stock (kg)</h3><p class="mut pnote">Need = packets × pack size × seasoning %. From this month on: green while usable (unexpired) stock still covers the running total, red once it runs short. Past months are greyed out and not counted against today's stock.</p>
 <table class="pt"><thead><tr><th>Seasoning</th><th class="n">%</th><th class="n">Usable stock</th>${months.map(m=>`<th class="n${m<cur?' past':''}">${mlabel(m)}</th>`).join('')}<th class="n">Need from ${ahead.length?mlabel(ahead[0]):'now'}</th><th class="n">Left after plan</th><th></th></tr></thead><tbody>${rows1}</tbody></table>`;
 // 1b. per product, laid out like Working → Table 3
 const rowsT3=skus.flatMap(sk=>{const list=(sk.seasonings||[]).length?sk.seasonings:[''];return list.map((n,k)=>{const pc=n?P[n]?.pct:null;
  const vals=months.map(m=>pc?(+(S.plan[sk.id+'|'+m]||0))*(+sk.pack_kg||0)*pc:0),tot=vals.reduce((s,v)=>s+v,0);
  return`<tr${k?' class="extra"':''}><td>${esc(sk.item_code||'')}</td><td>${esc(sk.id)}</td><td>${k?'<span class="mut">↳ also uses</span>':esc(sk.name)}</td><td>${esc(n)||'<span class="mut">—</span>'}</td><td class="n">${pc?pctS(pc)+'%':''}</td><td class="n">${sk.pack_kg?+sk.pack_kg:''}</td>${vals.map(v=>`<td class="n">${pc?fmt(Math.round(v*1000)/1000):''}</td>`).join('')}<td class="n c">${pc?fmt(Math.round(tot*1000)/1000):''}</td></tr>`})}).join('');
 const t1b=`<h3 class="ph">Seasoning needed per product (kg) — like Working, Table 3</h3><p class="mut pnote">Same rows and columns as Table 3 in the Working sheet, so you can compare cell by cell: packets (Table 1) × pack size (UOM) × seasoning %. All months shown. “Also uses” rows are second ingredients from the Calculation sheet (C100, CH10G), which Table 3 leaves out.</p>
 <div class="scroll"><table class="pt t3"><thead><tr><th>item_code</th><th>PE ID</th><th>sku_name</th><th>Seasoning</th><th class="n">%</th><th class="n">UOM</th>${months.map(m=>`<th class="n">${mlabel(m)}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>${rowsT3}</tbody></table></div>`;
 // 2. FG possible from current stock (Calculation sheet)
 const rows2=skus.flatMap(sk=>(sk.seasonings||[]).map((n,k)=>{const pc=P[n]?.pct,st=stockOf(n),fg=st!=null&&pc?st/pc:null,pk=fg!=null&&sk.pack_kg?fg/sk.pack_kg:null;
  const planned=months.reduce((s,m)=>s+(+(S.plan[sk.id+'|'+m]||0)),0);
  return`<tr><td>${k?'':`<b>${esc(sk.name)}</b> <span class="mut">${esc(sk.id)}</span>`}</td><td>${esc(n)}</td><td class="n">${pc?pctS(pc)+'%':''}</td><td class="n">${sk.pack_kg?fmt(sk.pack_kg*1000)+' g':''}</td><td class="n">${st!=null?fmt(st):''}</td><td class="n c">${fg!=null?fmt(Math.round(fg)):''}</td><td class="n c">${pk!=null?fmt(Math.round(pk)):''}</td><td class="n">${k?'':fmt(planned)}</td></tr>`})).join('');
 const t2=`<h3 class="ph">Finished goods possible from current stock</h3><p class="mut pnote">Like the Calculation sheet: usable seasoning ÷ % = FG kg, ÷ pack size = packets. Where several products share a seasoning, each row assumes all of it goes to that product.</p>
 <table class="pt"><thead><tr><th>Product</th><th>Seasoning</th><th class="n">%</th><th class="n">Pack</th><th class="n">Seasoning (kg)</th><th class="n">FG possible (kg)</th><th class="n">Packets possible</th><th class="n">Planned packets</th></tr></thead><tbody>${rows2}</tbody></table>`;
 // 3. plan grid (editable)
 const rows3=skus.map(sk=>{const tot=months.reduce((s,m)=>s+(+(S.plan[sk.id+'|'+m]||0)),0);
  return`<tr><td><b>${esc(sk.name)}</b><br><span class="mut">${esc(sk.id)} · ${esc((sk.seasonings||[]).join(', ')||'no seasoning')}</span></td><td class="n"><input type="number" min="0" step="1" data-sku="${esc(sk.id)}" data-f="pack_g" value="${sk.pack_kg?Math.round(sk.pack_kg*1000*100)/100:''}" aria-label="Pack size in grams"></td>${months.map(m=>`<td class="n"><input type="number" min="0" step="1" data-sku="${esc(sk.id)}" data-m="${m}" value="${S.plan[sk.id+'|'+m]??''}" aria-label="Packets ${mlabel(m)}"></td>`).join('')}<td class="n c">${fmt(tot)}</td></tr>`}).join('');
 const t3=`<h3 class="ph">Production plan (packets)</h3><p class="mut pnote">Type over any number; everything above updates.</p>
 <table class="pt plan"><thead><tr><th>Product</th><th class="n">Pack (g)</th>${months.map(m=>`<th class="n">${mlabel(m)}</th>`).join('')}<th class="n">Total</th></tr></thead><tbody>${rows3}</tbody></table>`;
 // 4. seasoning settings
 const rows4=names.map(n=>`<tr><td><b>${esc(n)}</b></td><td class="n"><input type="number" min="0" max="100" step="0.01" data-seas="${esc(n)}" data-f="pct" value="${pctS(P[n]?.pct)}" aria-label="Seasoning percent"></td><td><select data-seas="${esc(n)}" data-f="stock_grp" aria-label="Stock line">${sopt(P[n]?.stock_grp||'')}</select></td></tr>`).join('');
 const t4=`<h3 class="ph">Seasoning % and stock link</h3><p class="mut pnote">Which line of your Summary holds each seasoning's stock. Linked lines also get their FG Qty calculated on the Summary.</p>
 <table class="pt"><thead><tr><th>Seasoning</th><th class="n">% of FG</th><th>Stock (Summary line)</th></tr></thead><tbody>${rows4}</tbody></table>`;
 return imp+t1+t1b+t2+t3+t4}
/* import a projections workbook in the browser */
let PI=null;
function parseProj(buf){
 const wb=XLSX.read(buf,{type:'array',cellDates:true});const sh=n=>wb.Sheets[wb.SheetNames.find(x=>key(x)===key(n))];
 const grid=ws=>ws?XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}):[];
 const nk=v=>key(String(v??''));
 // Seasoning Per Kg
 const seas={};const sp=grid(sh('Seasoning Per Kg'));const hs=sp.findIndex(r=>r.some(c=>nk(c)==='item name'));
 if(hs>=0){const h=sp[hs].map(nk),ci=h.indexOf('item name'),cp=h.indexOf('per kg');for(const r of sp.slice(hs+1)){const n=String(r[ci]??'').trim();if(n&&typeof r[cp]==='number')seas[n]=r[cp]}}
 // Calculation: product → seasonings, pack size
 const skus={};const ca=grid(sh('Calculation'));const hc=ca.findIndex(r=>r.some(c=>nk(c)==='pe id'));
 if(hc>=0){const h=ca[hc].map(nk),c=k=>h.findIndex(x=>x===k),iId=c('pe id'),iCode=c('item_code'),iName=c('sku_name'),iS=h.findIndex(x=>x==='sesoning'||x==='seasoning'),iP=h.findIndex(x=>x==='sesoning per kg'||x==='seasoning per kg'),iU=c('uom');
  for(const r of ca.slice(hc+1)){const id=String(r[iId]??'').trim();if(!id)continue;const sk=skus[id]??={id,item_code:String(r[iCode]??''),name:String(r[iName]??id).trim(),pack_kg:null,seasonings:[]};
   if(typeof r[iU]==='number'&&!sk.pack_kg)sk.pack_kg=r[iU];const n=String(r[iS]??'').trim();if(n){if(!sk.seasonings.includes(n))sk.seasonings.push(n);if(typeof r[iP]==='number'&&seas[n]==null)seas[n]=r[iP]}}}
 // Working: first table of packets per month
 const wk=grid(sh('Working'));const hw=wk.findIndex(r=>r.some(c=>nk(c)==='pe id')&&r.some(c=>c instanceof Date));
 const client=(String((wk[0]||[])[0]??'').split(/[<>]/)[0]||'').trim();
 const plan=[],monthsSet=new Set();let order=0;
 if(hw>=0){const h=wk[hw],iId=h.findIndex(c=>nk(c)==='pe id'),iName=h.findIndex(c=>nk(c)==='sku_name'),iCode=h.findIndex(c=>nk(c)==='item_code');
  const mcols=h.map((c,i)=>{if(!(c instanceof Date))return null;const d=new Date(c.getTime()+12*36e5);let y=d.getUTCFullYear(),mo=d.getUTCMonth()+1,day=d.getUTCDate();
   if(day>=20&&day<=40)y=2000+day; // "Jul-26" typed in Sheets becomes 26 July: the day is the year
   return{i,m:y+'-'+String(mo).padStart(2,'0')+'-01'}}).filter(Boolean);
  for(const r of wk.slice(hw+1)){const id=String(r[iId]??'').trim();if(!id)break;order++;
   const sk=skus[id]??={id,item_code:String(r[iCode]??''),name:String(r[iName]??id).trim(),pack_kg:null,seasonings:[]};sk.sort=order;
   for(const{i,m}of mcols){monthsSet.add(m);if(typeof r[i]==='number')plan.push({sku_id:id,month:m,packets:r[i]})}}}
 const out=Object.values(skus).map(s=>({...s,client,sort:s.sort??(500+Object.keys(skus).indexOf(s.id))}));
 return{skus:out,seas:Object.entries(seas).map(([name,pct])=>({name,pct,stock_grp:S.ps?.[name]?.stock_grp||autoLink(name,client)})),plan,months:[...monthsSet].sort()}}
document.addEventListener('change',async e=>{if(e.target.id!=='pimp')return;const f=e.target.files[0];e.target.value='';if(!f)return;
 if(!window.XLSX){toast('Excel reader did not load — check your connection');return}
 try{PI=parseProj(await f.arrayBuffer());if(!PI.skus.length||!PI.months.length){PI=null;toast('No projections found in that file')}}catch(err){PI=null;toast('Could not read that file: '+err.message)}render()});
document.addEventListener('click',e=>{if(e.target.id==='pno'){PI=null;render()}else if(e.target.id==='pgo'&&PI){const p=PI;PI=null;act('importProj',p);toast(`Imported ${p.skus.length} products and ${p.plan.length} plan figures`)}});
/* page events */
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 if(d.open)open(d.open);else if(d.row)open(d.row,d.id);else if(d.wo)open('exp',d.wo);
 else if(d.allx){U.allx=!U.allx;render()}else if(d.c){U.client=d.c;render()}else if(d.v){U.view=d.v;PI=null;render()}
 else if(d.flag!=null){act('dismissFlag',{text:S.flags[+d.flag]})}
 else if(d.del){if(t.textContent!='sure?'){t.textContent='sure?';return}const m=S.moves.find(x=>x.id==d.del);act('deleteMove',{id:d.del});toast('Movement deleted',()=>act('addMove',{move:m}))}
 else if(d.item){U.view='batches';U.client=d.cl;U.q=d.item;$('#q').value=d.item;render()}});
$('#view').addEventListener('change',e=>{const i=e.target;
 if(i.dataset.m){const v=i.value.trim();if(v!==''&&!(+v>=0)){toast('Packets must be a number');render();return}act('setPlan',{sku:i.dataset.sku,month:i.dataset.m,v:v===''?0:+v});return}
 if(i.dataset.sku&&i.dataset.f=='pack_g'){const v=+i.value;if(!(v>0)){toast('Pack size must be more than 0 g');render();return}act('setSku',{id:i.dataset.sku,f:'pack_kg',v:v/1000});return}
 if(i.dataset.seas){if(i.dataset.f=='pct'){const v=i.value.trim();if(v!==''&&!(+v>0&&+v<=100)){toast('Seasoning % must be between 0 and 100');render();return}act('setSeas',{name:i.dataset.seas,f:'pct',v:v===''?null:+v/100})}else act('setSeas',{name:i.dataset.seas,f:'stock_grp',v:i.value});return}
 if(!i.dataset.f)return;
 if(i.dataset.it){let v=i.value.trim();if(i.dataset.f=='fg'){if(v!==''&&!(+v>=0)){toast('FG Qty must be a number');render();return}v=v===''?'':+v}
  act('setItem',{id:i.dataset.it,client:i.dataset.cl,item:i.dataset.nm,f:i.dataset.f,v});return}
 const b=S.batches.find(x=>x.id==i.dataset.b);if(!b)return;
 const v=i.dataset.f=='opening'?(+i.value||0):i.value.trim();if(v!==b[i.dataset.f])act('updateBatch',{id:b.id,f:i.dataset.f,v})});
$('#q').oninput=e=>{U.q=e.target.value;render()};
$('#empty').onchange=e=>{U.empty=e.target.checked;render()};
/* excel */
$('#xl').onclick=async()=>{if(!window.XLSX){toast('Excel library did not load — check your connection');return}calc();
 const wb=XLSX.utils.book_new(),B=Object.fromEntries(S.batches.map(b=>[b.id,b]));
 const rowOf=(b,i)=>{const c=C[b.id];return{'Sl.No':i+1,Seasoning:b.item,Base:b.base,Supplier:b.supplier,'Product Code':b.code,Batch:b.batch,MFG:dshow(b.mfg),EXP:dshow(b.exp),'Shelf-life Ext.':dshow(b.ext),'Opening Stock':b.opening,Received:c.in,Used:c.use,'Written off':c.exp,Corrections:c.adj,'Closing Stock':c.close,Remark:b.remark}};
 const sum=[];for(const r of summary(S.batches)){(r.live.length?r.live:[null]).forEach((b,k)=>sum.push({'Sl No':k==0&&r.inSum?r.sort:'',Name:k==0?r.item:'',Client:k==0?r.client:'',Batch:b?b.batch:'No stock',EXP:b?dshow(effExp(b)):'','Qty (kg)':b?+stock(b).toFixed(3):'','FG Qty (kg)':'',Remarks:''}));
  sum.push({'Sl No':'',Name:'Total – '+r.item,Client:r.inSum?'':'(not on Summary)',Batch:r.live.length+' batch'+(r.live.length==1?'':'es'),EXP:'','Qty (kg)':+r.kg.toFixed(3),'FG Qty (kg)':r.fg!=null?Math.round(r.fg):'',Remarks:[r.auto,r.remark].filter(Boolean).join(' · ')})}
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(sum),'Summary');
 for(const cl of clients())XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.batches.filter(b=>b.client==cl).map(rowOf)),cl.slice(0,31));
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.moves.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(m=>({Date:dshow(m.date),Type:NAMES[m.t],Client:B[m.b]?.client,Seasoning:B[m.b]?.item,Batch:B[m.b]?.batch,'For client':m.t=='use'?(m.fc||B[m.b]?.client):'','Qty (kg)':m.t=='use'||m.t=='exp'?-m.q:m.q,Note:m.note}))),'Movements');
 const name='Seasonings_Stock_'+today()+'.xlsx',blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
if(location.hash=='#projections')U.view='proj';
render();status();
(async()=>{let ok=false;try{const c=client();if(c){const{data}=await c.auth.getSession();ok=!!data.session}}catch(e){}if(!ok)showSetup(CFG.url?'Please sign in.':'');else{goLive();Q.length?flush():pull()}})();
}
