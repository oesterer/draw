const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const types={process:'Process',decision:'Decision',terminal:'Start / End',data:'Input / Output',database:'Database',document:'Document',circle:'Circle',text:'Text'};
let nodes=[{id:'a',type:'terminal',x:470,y:90,w:180,h:56,text:'Start onboarding',fill:'#e6eee8',stroke:'#72917b'},{id:'b',type:'process',x:460,y:205,w:200,h:72,text:'Create an account',fill:'#ffffff',stroke:'#8ba593'},{id:'c',type:'decision',x:465,y:342,w:190,h:115,text:'Email verified?',fill:'#fcf2d9',stroke:'#c4aa64'},{id:'d',type:'process',x:175,y:365,w:180,h:72,text:'Send a reminder',fill:'#f8e9e4',stroke:'#c4a397'},{id:'e',type:'process',x:460,y:525,w:200,h:72,text:'Set up your workspace',fill:'#ffffff',stroke:'#8ba593'},{id:'f',type:'terminal',x:470,y:670,w:180,h:56,text:'Ready to go ✨',fill:'#dcebdc',stroke:'#72917b'}].map(n=>({...n,font:14,sw:2}));
let edges=[{id:'ab',from:'a',to:'b'},{id:'bc',from:'b',to:'c'},{id:'cd',from:'c',to:'d',label:'No'},{id:'db',from:'d',to:'b'},{id:'ce',from:'c',to:'e',label:'Yes'},{id:'ef',from:'e',to:'f'}],selected='b',viewX=600,viewY=425,tool='select',pending=null,zoom=1,history=[],future=[],drag=null;
const uid=()=>Math.random().toString(36).slice(2,10),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function snapshot(){return JSON.stringify({nodes,edges,title:$('title').value})}function remember(){history.push(snapshot());if(history.length>80)history.shift();future=[]}function restore(s){const d=JSON.parse(s);nodes=d.nodes;edges=d.edges;$('title').value=d.title;selected=null;render();persist()}
function persist(){try{localStorage.setItem('flow-studio',snapshot());$('saved').textContent='● All changes saved'}catch{$('saved').textContent='Storage full — save a file'}}
try{const s=localStorage.getItem('flow-studio');if(s){const d=JSON.parse(s);nodes=d.nodes;edges=d.edges;$('title').value=d.title}}catch{}
function geometry(n){const {w,h,type}=n;if(type==='decision')return `<polygon points="${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}"/>`;if(type==='circle')return `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}"/>`;if(type==='data')return `<polygon points="20,0 ${w},0 ${w-20},${h} 0,${h}"/>`;if(type==='database')return `<path d="M0 12 C0 -4 ${w} -4 ${w} 12 V${h-12} C${w} ${h+4} 0 ${h+4} 0 ${h-12}Z M0 12 C0 28 ${w} 28 ${w} 12"/>`;if(type==='document')return `<path d="M0 0 H${w} V${h-12} Q${w*.75} ${h-25} ${w/2} ${h-12} T0 ${h-12}Z"/>`;return `<rect width="${w}" height="${h}" rx="${type==='terminal'?h/2:7}"/>`}
function nodeMarkup(n,editing=true){const lines=n.text.split('\n'),font=n.font||14;return `<g class="node" data-id="${n.id}" transform="translate(${n.x} ${n.y})"><g fill="${n.type==='text'?'none':n.fill}" stroke="${n.type==='text'?'none':n.stroke}" stroke-width="${n.sw||2}">${geometry(n)}</g><text x="${n.w/2}" y="${n.h/2-(lines.length-1)*font*.65}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="${font}" fill="#344c3c">${lines.map((l,i)=>`<tspan x="${n.w/2}" dy="${i?font*1.3:0}">${esc(l)}</tspan>`).join('')}</text>${editing&&selected===n.id?`<rect x="-5" y="-5" width="${n.w+10}" height="${n.h+10}" rx="9" fill="none" stroke="#438963" stroke-width="1.3" stroke-dasharray="4 3"/><rect class="resize" x="${n.w-4}" y="${n.h-4}" width="9" height="9" fill="white" stroke="#438963"/>${[[n.w/2,-5],[n.w+5,n.h/2],[n.w/2,n.h+5],[-5,n.h/2]].map(([x,y])=>`<circle class="port" cx="${x}" cy="${y}" r="4" fill="white" stroke="#438963"/>`).join('')}`:''}</g>`}
function route(e){const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);if(!a||!b)return '';if(a===b)return{d:`M${a.x+a.w} ${a.y+a.h*.3} H${a.x+a.w+35} V${a.y+a.h+30} H${a.x+a.w/2} V${a.y+a.h}`,x:a.x+a.w+35,y:a.y+a.h+45};let x1=a.x+a.w/2,y1=a.y+a.h/2,x2=b.x+b.w/2,y2=b.y+b.h/2;const vertical=Math.abs(y2-y1)>Math.abs(x2-x1)*.6;if(vertical){y1+=Math.sign(y2-y1)*a.h/2;y2-=Math.sign(y2-y1)*b.h/2;const m=(y1+y2)/2;return {d:`M${x1} ${y1} V${m} H${x2} V${y2}`,x:(x1+x2)/2,y:m-10}}x1+=Math.sign(x2-x1)*a.w/2;x2-=Math.sign(x2-x1)*b.w/2;const m=(x1+x2)/2;return{d:`M${x1} ${y1} H${m} V${y2} H${x2}`,x:m,y:(y1+y2)/2-12}}
function contents(editing=true){return `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#8b9d90" stroke-width="1.5"/></marker></defs>${edges.map(e=>{const p=route(e);return p?`<g class="edge" data-edge="${e.id}"><path d="${p.d}" stroke="transparent" stroke-width="14" fill="none"/><path d="${p.d}" stroke="${editing&&selected===e.id?'#3c8660':'#91a195'}" stroke-width="1.6" fill="none" marker-end="url(#arrow)"/>${e.label?`<text x="${p.x}" y="${p.y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#819184" paint-order="stroke" stroke="${editing?'#f7f9f7':'white'}" stroke-width="5">${e.label.split('\n').map((line,i)=>`<tspan x="${p.x}" dy="${i?14:0}">${esc(line)}</tspan>`).join('')}</text>`:''}</g>`:''}).join('')}${nodes.map(n=>nodeMarkup(n,editing)).join('')}`}
function render(){const w=1200/zoom,h=850/zoom;$('canvas').setAttribute('viewBox',`${viewX-w/2} ${viewY-h/2} ${w} ${h}`);$('canvas').innerHTML=contents();$('counts').textContent=`${nodes.length} shapes · ${edges.length} connections`;$('zoomValue').textContent=Math.round(zoom*100)+'%';$('undo').disabled=!history.length;$('redo').disabled=!future.length;inspector()}
function inspector(){const n=nodes.find(n=>n.id===selected);$('inspector').style.opacity=n?'1':'.45';$('inspector').querySelectorAll('input,textarea,select,button').forEach(e=>e.disabled=!n);$('selectedName').textContent=n?types[n.type]:'Select a shape';if(!n)return;$('label').value=n.text;$('fill').value=n.fill;$('fillHex').textContent=n.fill.toUpperCase();$('stroke').value=n.stroke;$('strokeWidth').value=n.sw||2;$('fontSize').value=n.font||14;$('dimensions').innerHTML=['x','y','w','h'].map(k=>`<label>${{x:'X',y:'Y',w:'Width',h:'Height'}[k]}<input type="number" data-prop="${k}" value="${Math.round(n[k])}" min="${k==='w'||k==='h'?30:-10000}"></label>`).join('');$('dimensions').querySelectorAll('input').forEach(el=>el.onchange=()=>{remember();n[el.dataset.prop]=Math.max(el.min,Number(el.value));render();persist()})}
function point(e){const p=$('canvas').createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform($('canvas').getScreenCTM().inverse())}
function add(type,x=500,y=330){remember();const id=uid();nodes.push({id,type,x,y,w:type==='decision'?170:180,h:type==='decision'?110:70,text:type==='text'?'Your text':types[type],fill:type==='decision'?'#fcf2d9':'#ffffff',stroke:'#8ba593',font:14,sw:2});selected=id;setTool('select');render();persist()}
function connect(id){if(!pending){pending=id;selected=id;toast('Now click the destination shape')}else if(pending!==id){remember();edges.push({id:uid(),from:pending,to:id});pending=null;setTool('select');persist()}render()}
let lastPress=null;
$('canvas').onpointerdown=e=>{
  if(e.button!==undefined&&e.button!==0)return;
  // Rendering replaces SVG children, so native dblclick targets are not stable.
  // Match presses by diagram ID instead of depending on the old DOM element.
  if(inlineEditor)inlineEditor.finish(true);
  const group=e.target.closest('[data-id]'),edge=e.target.closest('[data-edge]');
  const id=group?.dataset.id||edge?.dataset.edge;
  const handle=e.target.classList.contains('port')||e.target.classList.contains('resize');
  const now=Date.now();
  if(id&&tool==='select'&&!handle&&lastPress?.id===id&&now-lastPress.time<500&&Math.hypot(e.clientX-lastPress.x,e.clientY-lastPress.y)<6){
    lastPress=null;e.preventDefault();editInline(id,!group);return;
  }
  lastPress=id&&tool==='select'&&!handle?{id,time:now,x:e.clientX,y:e.clientY}:null;
  if(group){
    if(tool==='connect'||e.target.classList.contains('port')){setTool('connect');connect(id);return}
    selected=id;const p=point(e),n=nodes.find(n=>n.id===id);
    drag={id,p,x:n.x,y:n.y,w:n.w,h:n.h,resize:e.target.classList.contains('resize'),moved:false};
    $('canvas').setPointerCapture(e.pointerId);render();
  }else if(edge){selected=id;render()}
  else if(tool==='text'){const p=point(e);add('text',p.x-90,p.y-35)}
  else{selected=null;pending=null;render()}
};
$('canvas').onpointermove=e=>{
  if(!drag)return;
  const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y;
  if(!drag.moved){
    if(Math.hypot(dx,dy)<3)return;
    remember();drag.moved=true;lastPress=null;
  }
  const n=nodes.find(n=>n.id===drag.id);
  if(drag.resize){n.w=Math.max(60,drag.w+dx);n.h=Math.max(35,drag.h+dy)}
  else{n.x=Math.round((drag.x+dx)/5)*5;n.y=Math.round((drag.y+dy)/5)*5}
  render();
};
$('canvas').onpointerup=()=>{if(drag){const moved=drag.moved;drag=null;if(moved)persist()}};
$('canvas').onpointercancel=()=>{drag=null;lastPress=null};
let inlineEditor=null;
function editInline(id,isEdge=false){
  if(inlineEditor)inlineEditor.finish(true);
  const item=(isEdge?edges:nodes).find(item=>item.id===id);
  if(!item)return;
  selected=id;drag=null;setTool('select');render();
  const key=isEdge?'label':'text',original=item[key]||'',font=isEdge?11:(item.font||14);
  const p=isEdge?route(item):null;
  const width=isEdge?180:Math.max(60,item.w-16);
  const height=Math.max(isEdge?40:item.h-12,font*1.3*original.split('\n').length+12);
  const foreign=document.createElementNS(NS,'foreignObject');
  foreign.setAttribute('x',isEdge?p.x-width/2:item.x+(item.w-width)/2);
  foreign.setAttribute('y',isEdge?p.y-height/2:item.y+(item.h-height)/2);
  foreign.setAttribute('width',width);foreign.setAttribute('height',height);
  const wrap=document.createElement('div');wrap.className='inline-edit-wrap';
  const input=document.createElement('textarea');input.className='inline-editor';
  input.setAttribute('aria-label',isEdge?'Edit connection label':'Edit shape text');
  input.setAttribute('spellcheck','true');input.style.fontSize=font+'px';input.value=original;
  input.rows=Math.max(1,original.split('\n').length);
  wrap.append(input);foreign.append(wrap);$('canvas').append(foreign);
  const label=$('canvas').querySelector(`[${isEdge?'data-edge':'data-id'}="${id}"] text`);
  if(label)label.style.visibility='hidden';
  let finished=false;
  function finish(commit){
    if(finished)return;finished=true;inlineEditor=null;
    if(commit&&input.value!==original){remember();item[key]=input.value;persist()}
    foreign.remove();render();
  }
  inlineEditor={finish};
  input.onpointerdown=e=>e.stopPropagation();input.ondblclick=e=>e.stopPropagation();
  input.onblur=()=>finish(true);
  input.oninput=()=>{input.rows=Math.max(1,input.value.split('\n').length);const h=Math.max(height,input.rows*font*1.3+12);foreign.setAttribute('height',h);foreign.setAttribute('y',isEdge?p.y-h/2:item.y+(item.h-h)/2)};
  input.onkeydown=e=>{
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();finish(false)}
    else if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();finish(true)}
  };
  input.focus();input.select();
}
$('canvas').ondblclick=e=>{
  const group=e.target.closest('[data-id]'),edge=e.target.closest('[data-edge]');
  if(group){e.preventDefault();editInline(group.dataset.id)}
  else if(edge){e.preventDefault();editInline(edge.dataset.edge,true)}
};
function setTool(t){tool=t;pending=null;$('selectTool').classList.toggle('active',t==='select');$('connectTool').classList.toggle('active',t==='connect');$('textTool').classList.toggle('active',t==='text');$('canvas').style.cursor=t==='select'?'default':'crosshair'}
$('selectTool').onclick=()=>setTool('select');$('connectTool').onclick=()=>{setTool('connect');toast('Click a source shape, then a destination')};$('textTool').onclick=()=>{setTool('text');toast('Click the canvas to add text')};
function library(q=''){$('shapes').innerHTML=Object.entries(types).filter(([k,v])=>v.toLowerCase().includes(q.toLowerCase())).map(([k,v])=>`<button class="shape-card" draggable="true" data-type="${k}"><svg viewBox="-3 -3 86 56"><g fill="#f7faf7" stroke="#82988a" stroke-width="1.3">${geometry({type:k,w:80,h:48})}</g>${k==='text'?'<text x="33" y="33" font-size="30" fill="#82988a">T</text>':''}</svg>${v}</button>`).join('');document.querySelectorAll('.shape-card').forEach(el=>{el.onclick=()=>add(el.dataset.type);el.ondragstart=e=>e.dataTransfer.setData('shape',el.dataset.type)})}library();$('search').oninput=e=>library(e.target.value);$('canvas').ondragover=e=>e.preventDefault();$('canvas').ondrop=e=>{e.preventDefault();const t=e.dataTransfer.getData('shape');if(types[t]){const p=point(e);add(t,p.x-90,p.y-35)}};
function update(prop,value){const n=nodes.find(n=>n.id===selected);if(!n)return;remember();n[prop]=value;render();persist()}
$('label').onchange=e=>update('text',e.target.value);$('fill').oninput=e=>update('fill',e.target.value);$('stroke').oninput=e=>update('stroke',e.target.value);$('strokeWidth').onchange=e=>update('sw',+e.target.value);$('fontSize').onchange=e=>update('font',+e.target.value);
$('swatches').innerHTML=['#ffffff','#e6eee8','#dcebdc','#fcf2d9','#f8e9e4','#e5eaf5'].map(c=>`<button aria-label="Set fill ${c}" style="background:${c}" data-color="${c}"></button>`).join('');$('swatches').onclick=e=>{if(e.target.dataset.color)update('fill',e.target.dataset.color)};
function remove(){if(!selected)return;remember();nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(e=>e.id!==selected&&e.from!==selected&&e.to!==selected);selected=null;render();persist()}
$('delete').onclick=remove;$('duplicate').onclick=()=>{const n=nodes.find(n=>n.id===selected);if(n){remember();const copy={...n,id:uid(),x:n.x+30,y:n.y+30};nodes.push(copy);selected=copy.id;render();persist()}};
$('undo').onclick=()=>{if(history.length){future.push(snapshot());restore(history.pop())}};$('redo').onclick=()=>{if(future.length){history.push(snapshot());restore(future.pop())}};
function changeZoom(v){zoom=Math.min(2,Math.max(.03,v));render()}$('zoomIn').onclick=()=>changeZoom(zoom+.1);$('zoomOut').onclick=()=>changeZoom(zoom-.1);$('zoomValue').onclick=()=>changeZoom(1);$('fit').onclick=fitDiagram;$('title').onchange=persist;
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('toast').style.opacity=0,3200)}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}function filename(){return $('title').value.trim().replace(/[^a-z0-9 _-]/gi,'')||'Diagram'}
$('save').onclick=()=>{download(new Blob([snapshot()],{type:'application/json'}),filename()+'.json');toast('Editable diagram saved')};
$('open').onclick=()=>$('fileInput').click();
$('fileInput').onchange=async e=>{
  try{
    const raw=JSON.parse(await e.target.files[0].text());
    const lucid=raw.product==='lucidchart',d=lucid?importLucidchart(raw):raw;
    if(!Array.isArray(d.nodes)||!Array.isArray(d.edges)||d.nodes.some(n=>!types[n.type]||!['x','y','w','h'].every(k=>Number.isFinite(n[k]))||typeof n.text!=='string'||!/^#[0-9a-f]{6}$/i.test(n.fill)||!/^#[0-9a-f]{6}$/i.test(n.stroke)||!/^[a-z0-9]+$/i.test(n.id)))throw Error('Invalid diagram');
    const ids=new Set(d.nodes.map(n=>n.id));
    if(ids.size!==d.nodes.length||d.edges.some(edge=>!/^[a-z0-9]+$/i.test(edge.id)||!ids.has(edge.from)||!ids.has(edge.to)||(edge.label!==undefined&&typeof edge.label!=='string')))throw Error('Invalid connections');
    remember();restore(JSON.stringify(d));fitDiagram();
    if(lucid){alert(`Imported ${d.nodes.length} editable shapes and ${d.edges.length} connections.\n\nThis Lucidchart JSON export does not include layout or appearance. Flow Studio generated a new layout with default styling.${raw.pages.length>1?' All pages were combined on one canvas.':''}${d.warnings.length?'\n\n'+d.warnings.join('\n'):''}`)}
    else toast('Diagram opened');
  }catch{toast('Please choose a valid Flow Studio or Lucidchart JSON file')}
  e.target.value='';
};
function fitDiagram(){const b=bounds();viewX=b.x+b.w/2;viewY=b.y+b.h/2;changeZoom(Math.min(1,1200/b.w,850/b.h)*.9)}
$('canvas').addEventListener('wheel',e=>{
  e.preventDefault();if(inlineEditor)inlineEditor.finish(true);
  if(e.ctrlKey||e.metaKey)changeZoom(zoom*Math.exp(-e.deltaY*.005));
  else{const rect=$('canvas').getBoundingClientRect(),scale=Math.max(1200/zoom/rect.width,850/zoom/rect.height);viewX+=(e.shiftKey?e.deltaY:e.deltaX)*scale;viewY+=(e.shiftKey?0:e.deltaY)*scale;render()}
},{passive:false});
$('export').onclick=()=>$('exportDialog').showModal();
function bounds(){if(!nodes.length)return{x:0,y:0,w:1200,h:850};const x=Math.min(...nodes.map(n=>n.x))-60,y=Math.min(...nodes.map(n=>n.y))-60;return{x,y,w:Math.max(...nodes.map(n=>n.x+n.w))-x+60,h:Math.max(...nodes.map(n=>n.y+n.h))-y+60}}
function makePDF(canvas){const jpeg=atob(canvas.toDataURL('image/jpeg',.95).split(',')[1]),w=canvas.width/2,h=canvas.height/2,stream=`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;let s='%PDF-1.4\n',offsets=[0];const obj=(id,value)=>{offsets[id]=s.length;s+=`${id} 0 obj\n${value}\nendobj\n`};obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);obj(4,`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg}\nendstream`);obj(5,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);const start=s.length;s+='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<=5;i++)s+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';s+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new Blob([Uint8Array.from(s,c=>c.charCodeAt(0))],{type:'application/pdf'})}
$('download').onclick=async()=>{const btn=$('download');btn.disabled=true;btn.textContent='Preparing download…';try{const b=bounds(),svg=`<svg xmlns="${NS}" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="white"/>${contents(false)}</svg>`,blob=new Blob([svg],{type:'image/svg+xml'}),format=$('format').value;if(format==='svg')download(blob,filename()+'.svg');else{const url=URL.createObjectURL(blob),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const c=document.createElement('canvas'),scale=Math.min(2,8000/Math.max(b.w,b.h));c.width=Math.ceil(b.w*scale);c.height=Math.ceil(b.h*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);if(format==='pdf')download(makePDF(c),filename()+'.pdf');else download(await new Promise(r=>c.toBlob(r,'image/png')),filename()+'.png')}finally{URL.revokeObjectURL(url)}}$('exportDialog').close();toast('Your diagram is ready')}catch{toast('Export failed. Please try again.')}finally{btn.disabled=false;btn.textContent='Download diagram ↓'}};
$('documentTab').onclick=()=>{if(confirm('Start a new blank diagram? Your current diagram can be saved with “Save file” first.')){remember();nodes=[];edges=[];selected=null;$('title').value='Untitled diagram';render();persist()}};$('documentTab').textContent='New diagram';
$('help').onclick=()=>alert('Flow Studio shortcuts\n\nV — Select\nC — Connect shapes\nT — Add text\nDelete — Remove selection\n⌘/Ctrl Z — Undo\n⌘/Ctrl Shift Z — Redo\n⌘/Ctrl D — Duplicate\n⌘/Ctrl S — Save editable file\nEscape — Cancel connection\n\nDrag shapes from the library. Drag the lower-right handle to resize. Double-click shapes or connections to edit text directly. Enter saves, Shift+Enter adds a line, Escape cancels.');
document.onkeydown=e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();if(mod&&['z','s','d'].includes(k)){e.preventDefault();if(k==='z')$(e.shiftKey?'redo':'undo').click();if(k==='s')$('save').click();if(k==='d')$('duplicate').click()}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}else if(k==='escape'){setTool('select');selected=null;render()}else if(k==='v')setTool('select');else if(k==='c')$('connectTool').click();else if(k==='t')$('textTool').click()};render();persist();
