{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
$('#root').innerHTML=$('#shell').innerHTML;
let LS=null;try{LS=window.localStorage;LS.getItem('x')}catch(e){LS=null}
const lsGet=(k,d)=>{try{const v=LS&&LS.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const lsSet=(k,v)=>{try{LS&&LS.setItem(k,JSON.stringify(v))}catch(e){}};
let CFG=lsGet('ss-cfg',{url:'',anon:''});
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
 $('#sub').textContent='Popular Essentials · '+dshow(today())+' · '+clients().length+' clients';
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
 const inp=(b,f,cls='',type='text')=>`<input class="${cls}" type="${type}" data-b="${b.id}" data-f="${f}" value="${esc(b[f])}" aria-label="${f}">`;
 return`<table><thead><tr>${U.client=='All'?'<th>Client</th>':''}<th>Seasoning</th><th>Base</th><th>Supplier</th><th>Product code</th><th>Batch</th><th>MFG</th><th>EXP</th><th></th><th class="n">Opening</th><th class="n">In</th><th class="n">Used</th><th class="n">Written off</th><th class="n">Closing</th><th>Quick</th><th>Remark</th></tr></thead><tbody>${rows.map(b=>{const c=C[b.id];return`<tr class="${c.close>0?'':'dead'}">${U.client=='All'?`<td>${esc(b.client)}</td>`:''}<td>${inp(b,'item','w')}</td><td>${inp(b,'base')}</td><td>${inp(b,'supplier')}</td><td>${inp(b,'code')}</td><td>${inp(b,'batch')}</td><td>${inp(b,'mfg','','date')}</td><td>${inp(b,'exp','','date')}</td><td>${chip(b)}</td><td class="n">${inp(b,'opening','','number')}</td><td class="n">${c.in?fmt(c.in):''}</td><td class="n">${c.use?fmt(c.use):''}</td><td class="n">${c.exp?fmt(c.exp):''}</td><td class="n c">${fmt(c.close)}</td><td><div class="rb"><button title="Receive into this batch" data-row="in" data-id="${b.id}">+</button><button title="Use in production" data-row="use" data-id="${b.id}">−</button><button title="Write off" data-row="exp" data-id="${b.id}">×</button></div></td><td>${inp(b,'remark')}</td></tr>`}).join('')}</tbody></table>`}
function renderItems(){
 const g={};for(const b of vis()){const k=b.client+'|'+key(b.item);(g[k]??={item:b.item,client:b.client,bs:[]}).bs.push(b)}
 const d30=new Date(Date.parse(today())-30*864e5).toISOString().slice(0,10);
 const rows=Object.values(g).map(x=>{const live=x.bs.filter(b=>stock(b)>0);const ids=new Set(x.bs.map(b=>b.id));
  return{...x,live,kg:live.reduce((s,b)=>s+stock(b),0),next:live.map(effExp).filter(Boolean).sort()[0],used:S.moves.filter(m=>ids.has(m.b)&&m.t=='use'&&m.date>=d30).reduce((s,m)=>s+m.q,0)}}).sort((a,b)=>b.kg-a.kg);
 if(!rows.length)return'<div class="empty">Nothing matches.</div>';
 return`<table><thead><tr><th>Seasoning</th><th>Client</th><th class="n">Live batches</th><th class="n">On hand (kg)</th><th>Nearest expiry</th><th></th><th class="n">Used, 30 days</th></tr></thead><tbody>${rows.map(r=>`<tr class="click ${r.kg>0?'':'dead'}" data-item="${esc(r.item)}" data-cl="${esc(r.client)}"><td><b>${esc(r.item)}</b></td><td>${esc(r.client)}</td><td class="n">${r.live.length}</td><td class="n c">${fmt(r.kg)}</td><td>${dshow(r.next)}</td><td>${r.next?chip({exp:r.next}):''}</td><td class="n">${r.used?fmt(r.used):''}</td></tr>`).join('')}</tbody></table>`}
function renderLog(){
 const ids=new Set(vis().map(b=>b.id)),B=Object.fromEntries(S.batches.map(b=>[b.id,b]));
 const ms=S.moves.filter(m=>ids.has(m.b)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id,undefined,{numeric:true})).slice(0,300);
 if(!ms.length)return'<div class="empty">No movements yet. Every receipt, use and write-off will be listed here.</div>';
 return`<table><thead><tr><th>Date</th><th>Type</th><th>Client</th><th>Seasoning</th><th>Batch</th><th class="n">Qty (kg)</th><th>Note</th><th></th></tr></thead><tbody>${ms.map(m=>{const b=B[m.b];return`<tr><td>${dshow(m.date)}</td><td><span class="t ${m.t}">${NAMES[m.t]}</span></td><td>${esc(b.client)}</td><td>${esc(b.item)}</td><td>${esc(b.batch)}</td><td class="n c">${m.t=='use'||m.t=='exp'?'−':m.q>0?'+':''}${fmt(m.q)}</td><td>${esc(m.note)}</td><td><button class="x" data-del="${m.id}">delete</button></td></tr>`}).join('')}</tbody></table>`}
function render(){calc();renderTop();$('#view').innerHTML=U.view=='items'?renderItems():U.view=='log'?renderLog():renderBatches();try{LS&&LS.setItem('ss-ui',JSON.stringify({client:U.client,view:U.view,empty:U.empty}))}catch(e){}}
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
 else if(op.a=='dismissFlag')S.flags=S.flags.filter(f=>f!=p.text)}
function act(a,p){if(!CFG.url){showSetup();return false}const op={id:uid(),a,p};apply(op);Q.push(op);lsSet('ss-queue',Q);lsSet('ss-cache',S);render();flush();return true}
function client(){if(!CFG.url||!window.supabase)return null;if(!sb)sb=window.supabase.createClient(CFG.url,CFG.anon,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'ss-auth'}});return sb}
const nz=v=>v===''||v==null?null:v,ez=v=>v==null?'':String(v);
function chk(r){if(r&&r.error){const c=String(r.error.code||''),msg=r.error.message||'error',e=new Error(msg);
 e.fatal=c=='PGRST301'||c=='42501'||r.status==401||/jwt|not authenticated|row-level security/i.test(msg);
 e.drop=!e.fatal&&/^(22|23)/.test(c);throw e}return r.data}
async function fetchAll(t,f){let out=[],from=0;for(;;){let q=client().from(t).select('*').order(t=='flags'?'text':'id').range(from,from+999);if(f)q=f(q);const d=chk(await q)||[];out=out.concat(d);if(d.length<1000)return out;from+=1000}}
const toRow=b=>({id:b.id,client:b.client,item:b.item,base:b.base||'',supplier:b.supplier||'',code:b.code||'',batch:b.batch||'',mfg:nz(b.mfg),exp:nz(b.exp),ext:nz(b.ext),opening:+b.opening||0,remark:b.remark||''});
const moveRow=m=>({id:m.id,date:m.date,batch_id:m.b,type:m.t,qty:+m.q,note:m.note||'',deleted:false,deleted_at:null});
const API={
 async all(){const[b,m,f]=await Promise.all([fetchAll('batches'),fetchAll('movements',q=>q.eq('deleted',false)),fetchAll('flags',q=>q.eq('done',false))]);
  return{batches:b.map(x=>({...toRow(x),mfg:ez(x.mfg),exp:ez(x.exp),ext:ez(x.ext)})),moves:m.map(x=>({id:x.id,date:x.date,b:x.batch_id,t:x.type,q:+x.qty,note:x.note||''})),flags:f.map(x=>x.text)}},
 async addMove(p){const c=client();if(p.batch)chk(await c.from('batches').upsert(toRow(p.batch),{onConflict:'id',ignoreDuplicates:true}));chk(await c.from('movements').upsert(moveRow(p.move),{onConflict:'id'}))},
 async deleteMove(p){chk(await client().from('movements').update({deleted:true,deleted_at:new Date().toISOString()}).eq('id',p.id))},
 async updateBatch(p){const v=['mfg','exp','ext'].includes(p.f)?nz(p.v):p.f=='opening'?(+p.v||0):(p.v??'');chk(await client().from('batches').update({[p.f]:v}).eq('id',p.id))},
 async dismissFlag(p){chk(await client().from('flags').update({done:true}).eq('text',p.text))},
 async importAll(p){const c=client(),r=await c.from('batches').select('id',{count:'exact',head:true});chk(r);
  if(r.count>0)throw new Error('The database already has batches — import is only for an empty database');
  const put=async(t,rows,opt)=>{for(let i=0;i<rows.length;i+=500)chk(await c.from(t).upsert(rows.slice(i,i+500),opt))};
  await put('batches',p.batches.map(toRow),{onConflict:'id'});
  await put('movements',p.moves.map(moveRow),{onConflict:'id'});
  await put('flags',p.flags.map(t=>({text:t,done:false})),{onConflict:'text',ignoreDuplicates:true});
  return{imported:{batches:p.batches.length,moves:p.moves.length,flags:p.flags.length}}}};
async function call(a,p){if(!client()){const e=new Error(window.supabase?'Not connected':'Could not load the database library — check your connection');e.fatal=!!window.supabase;throw e}return API[a](p)}
async function flush(){if(busy||!CFG.url)return;busy=true;status();
 try{while(Q.length){try{await call(Q[0].a,Q[0].p)}catch(e){if(!e.drop)throw e;toast('The database refused a change: '+e.message)}Q.shift();lsSet('ss-queue',Q);fails=0;offline=false}
  busy=false;await pull(true)}
 catch(e){busy=false;fails++;if(e.fatal){showSetup('Please sign in again.')}else{offline=true;clearTimeout(retryT);retryT=setTimeout(flush,Math.min(60000,2000*2**fails))}}
 status()}
async function pull(force){if(!CFG.url||busy)return;if(Q.length&&!force)return flush();busy=true;
 try{const j=await call('all',{});S=j;Q.forEach(apply);lsSet('ss-cache',S);lastSync=new Date();offline=false;render()}
 catch(e){if(e.fatal)showSetup('Please sign in again.');else offline=true}
 busy=false;status()}
let liveT;
function goLive(){const c=client();if(!c||live)return;try{live=c.channel('stock').on('postgres_changes',{event:'*',schema:'public'},()=>{clearTimeout(liveT);liveT=setTimeout(()=>Q.length?flush():pull(),700)}).subscribe()}catch(e){}}
setInterval(()=>{if(document.visibilityState=='visible')Q.length?flush():pull()},60000);
addEventListener('focus',()=>pull());addEventListener('online',()=>flush());
/* connection + sign-in */
const SF=$('#sf');
async function showSetup(msg){SF.url.value=CFG.url;SF.anon.value=CFG.anon;$('#smsg').className=msg&&!/^Signed in/.test(msg)?'bad':'';$('#smsg').textContent=msg||'';
 let email='';try{const c=client();if(c){const{data}=await c.auth.getSession();email=data.session?.user?.email||''}}catch(e){}
 $('#who').textContent=email?'Signed in as '+email:'';$('#signout').hidden=!email;
 $('#imp').hidden=!(email&&!S.batches.length);$('#setup').hidden=false}
SF.addEventListener('submit',async e=>{e.preventDefault();const url=SF.url.value.trim().replace(/\/+$/,''),anon=SF.anon.value.trim(),email=SF.email.value.trim(),pw=SF.pw.value;
 const msg=(t,bad)=>{$('#smsg').className=bad?'bad':'';$('#smsg').textContent=t};
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))return msg('Project URL should look like https://abcd1234.supabase.co',1);
 if(!window.supabase)return msg('Could not load the database library — check your internet connection.',1);
 msg('Signing in…');if(url!=CFG.url||anon!=CFG.anon){sb=null;live=null}const old=CFG;CFG={url,anon};
 try{const r=await client().auth.signInWithPassword({email,password:pw});if(r.error)throw r.error;
  lsSet('ss-cfg',CFG);SF.pw.value='';const j=await call('all',{});S=j;Q.forEach(apply);lsSet('ss-cache',S);lastSync=new Date();render();status();goLive();
  $('#who').textContent='Signed in as '+email;$('#signout').hidden=false;
  if(!S.batches.length){msg('Signed in. The database is empty — import your starting stock below. If you expected data, check your email is in the members list.');$('#imp').hidden=false}
  else{msg(`Signed in — ${S.batches.length} batches loaded.`);setTimeout(()=>$('#setup').hidden=true,900)}flush()}
 catch(err){CFG=old;sb=null;msg(/invalid login/i.test(err.message||'')?'Wrong email or password.':'Could not connect: '+(err.message||err),1)}});
$('#impf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#smsg').className='';$('#smsg').textContent='Importing…';
 try{const d=JSON.parse(await f.text());if(!Array.isArray(d.batches))throw new Error('Not a stock file');const j=await call('importAll',{batches:d.batches,moves:d.moves||[],flags:d.flags||[]});
  $('#smsg').textContent=`Imported ${j.imported.batches} batches and ${j.imported.moves} movements.`;$('#imp').hidden=true;await pull(true);setTimeout(()=>$('#setup').hidden=true,1200)}
 catch(err){$('#smsg').className='bad';$('#smsg').textContent='Import failed: '+err.message}finally{e.target.value=''}};
$('#sx').onclick=()=>$('#setup').hidden=true;
$('#cfg').onclick=()=>showSetup();
$('#signout').onclick=async()=>{if(Q.length&&$('#signout').textContent!='Unsynced changes will be lost — tap again'){$('#signout').textContent='Unsynced changes will be lost — tap again';return}
 try{await client()?.auth.signOut()}catch(e){}['ss-cache','ss-queue','ss-auth'].forEach(k=>{try{LS&&LS.removeItem(k)}catch(e){}});
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
function hint(){const h=$('#fhint'),b=S.batches.find(x=>x.id==F.b.value),q=+F.q.value;h.className='';
 if(ft=='in'){const m=S.batches.find(x=>x.client==F.client.value&&key(x.item)==key(F.itm.value)&&F.batch.value&&key(x.batch)==key(F.batch.value));h.textContent=m?`Batch exists — this adds to it (now ${fmt(stock(m))} kg).`:F.itm.value?'Creates a new batch.':'';return}
 if(!b){h.textContent='';return}
 if(ft=='adj'){h.textContent=`Now ${fmt(stock(b))} kg. Enter + to add, − to reduce.`;return}
 if(q>stock(b)+1e-9){h.className='bad';h.textContent=`Only ${fmt(stock(b))} kg in this batch.`}else h.textContent=q?`Leaves ${fmt(stock(b)-q)} kg in this batch.`:`${fmt(stock(b))} kg available.`;
 if(ft=='use'&&days(effExp(b))<0){h.className='bad';h.textContent='This batch is expired. '+h.textContent}}
function setType(t){ft=t;$('#ftitle').textContent={in:'Receive stock',use:'Use in production',exp:'Write off / expired',adj:'Correct a count'}[t];
 $$('#ftype button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t==t));
 $('#fnew').hidden=t!='in';$('#fpick').hidden=t=='in';$('#fall').hidden=t=='in'||t=='adj';
 F.q.min=t=='adj'?'':'0.001';F.q.placeholder=t=='adj'?'e.g. -2.5':'';
 F.note.placeholder={in:'e.g. Invoice / GRN no.',use:'e.g. Line 2 – peri peri makhana',exp:'e.g. Expired, disposed',adj:'e.g. Physical count'}[t];
 F.batch.required=false;if(t!='in')fillBatches(F.b.value);else hint()}
function open(t,id){F.reset();F.date.value=today();if(U.client!='All')F.client.value=U.client;
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
  if(!b){b={id:nid(),client:cl,item:it,base:F.base.value.trim(),supplier:F.supplier.value.trim(),code:F.code.value.trim(),batch:F.batch.value.trim(),mfg:F.mfg.value,exp:F.exp.value,ext:'',opening:0,remark:''};created=true}}
 else{b=S.batches.find(x=>x.id==F.b.value);if(!b){$('#fhint').className='bad';$('#fhint').textContent='Pick a batch.';return}
  if(ft!='adj'&&q>stock(b)+1e-9){hint();return}}
 const m={id:nid(),date,b:b.id,t:ft,q,note};if(!act('addMove',created?{move:m,batch:b}:{move:m}))return;close();
 toast(`${NAMES[ft]} ${fmt(Math.abs(q))} kg · ${b.item}${b.batch?' ('+b.batch+')':''}`,()=>act('deleteMove',{id:m.id}))});
F.addEventListener('input',e=>{const n=e.target.name;if(n=='client'){fillLists();if(ft!='in')fillBatches()}else if(n=='itm'){if(ft!='in')fillBatches();else{const p=S.batches.filter(b=>b.client==F.client.value&&key(b.item)==key(F.itm.value)).pop();if(p)['code','supplier','base'].forEach(f=>{if(!F[f].value)F[f].value=p[f]||''});hint()}}else hint()});
$('#ftype').onclick=e=>{const t=e.target.closest('[data-t]');if(t)setType(t.dataset.t)};
$('#fall').onclick=()=>{const b=S.batches.find(x=>x.id==F.b.value);if(b){F.q.value=stock(b);hint()}};
$('#fx').onclick=close;$('#sheet').onclick=e=>{if(e.target.id=='sheet')close()};
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!$('#sheet').hidden)close()});
/* page events */
document.addEventListener('click',e=>{const t=e.target.closest('button,[data-item]');if(!t)return;const d=t.dataset;
 if(d.open)open(d.open);else if(d.row)open(d.row,d.id);else if(d.wo)open('exp',d.wo);
 else if(d.allx){U.allx=!U.allx;render()}else if(d.c){U.client=d.c;render()}else if(d.v){U.view=d.v;render()}
 else if(d.flag!=null){act('dismissFlag',{text:S.flags[+d.flag]})}
 else if(d.del){if(t.textContent!='sure?'){t.textContent='sure?';return}const m=S.moves.find(x=>x.id==d.del);act('deleteMove',{id:d.del});toast('Movement deleted',()=>act('addMove',{move:m}))}
 else if(d.item){U.view='batches';U.client=d.cl;U.q=d.item;$('#q').value=d.item;render()}});
$('#view').addEventListener('change',e=>{const i=e.target;if(!i.dataset.f)return;const b=S.batches.find(x=>x.id==i.dataset.b);if(!b)return;
 const v=i.dataset.f=='opening'?(+i.value||0):i.value.trim();if(v!==b[i.dataset.f])act('updateBatch',{id:b.id,f:i.dataset.f,v})});
$('#q').oninput=e=>{U.q=e.target.value;render()};
$('#empty').onchange=e=>{U.empty=e.target.checked;render()};
/* excel */
$('#xl').onclick=async()=>{if(!window.XLSX){toast('Excel library did not load — check your connection');return}calc();
 const wb=XLSX.utils.book_new(),B=Object.fromEntries(S.batches.map(b=>[b.id,b]));
 const rowOf=(b,i)=>{const c=C[b.id];return{'Sl.No':i+1,Seasoning:b.item,Base:b.base,Supplier:b.supplier,'Product Code':b.code,Batch:b.batch,MFG:dshow(b.mfg),EXP:dshow(b.exp),'Shelf-life Ext.':dshow(b.ext),'Opening Stock':b.opening,Received:c.in,Used:c.use,'Written off':c.exp,Corrections:c.adj,'Closing Stock':c.close,Remark:b.remark}};
 const sum=[];for(const cl of clients()){const g={};S.batches.filter(b=>b.client==cl).forEach(b=>{const k=key(b.item);(g[k]??={Client:cl,Seasoning:b.item,'On hand (kg)':0,'Live batches':0,'Nearest expiry':''});if(stock(b)>0){g[k]['On hand (kg)']+=stock(b);g[k]['Live batches']++;const e=effExp(b);if(e&&(!g[k]._e||e<g[k]._e))g[k]._e=e}});Object.values(g).forEach(r=>{r['Nearest expiry']=dshow(r._e);delete r._e;sum.push(r)})}
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(sum),'Summary');
 for(const cl of clients())XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.batches.filter(b=>b.client==cl).map(rowOf)),cl.slice(0,31));
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.moves.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(m=>({Date:dshow(m.date),Type:NAMES[m.t],Client:B[m.b]?.client,Seasoning:B[m.b]?.item,Batch:B[m.b]?.batch,'Qty (kg)':m.t=='use'||m.t=='exp'?-m.q:m.q,Note:m.note}))),'Movements');
 const name='Seasonings_Stock_'+today()+'.xlsx',blob=new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
render();status();
(async()=>{let ok=false;try{const c=client();if(c){const{data}=await c.auth.getSession();ok=!!data.session}}catch(e){}if(!ok)showSetup(CFG.url?'Please sign in.':'');else{goLive();Q.length?flush():pull()}})();
}
