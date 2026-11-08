const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {importLucidchart}=require('../lucid-import.js');
const sample=JSON.parse(fs.readFileSync(new URL('../ScurryUserFlows.json',`file://${__filename}`),'utf8'));
test('Scurry export preserves all shapes, text, and connections',()=>{
  const d=importLucidchart(sample),shapes=sample.pages[0].items.shapes,lines=sample.pages[0].items.lines;
  assert.equal(d.title,'Scurry User Flows');assert.equal(d.nodes.length,89);assert.equal(d.edges.length,97);assert.deepEqual(d.warnings,[]);
  const ids=new Map(shapes.map((shape,i)=>[shape.id,d.nodes[i].id]));
  shapes.forEach((shape,i)=>assert.equal(d.nodes[i].text,shape.textAreas.map(a=>a.text).filter(Boolean).join('\n')));
  lines.forEach((line,i)=>{assert.equal(d.edges[i].from,ids.get(line.endpoint1.connectedTo));assert.equal(d.edges[i].to,ids.get(line.endpoint2.connectedTo));assert.equal(d.edges[i].label,line.textAreas.map(a=>a.text).filter(Boolean).join('\n'))});
  assert.equal(new Set(d.nodes.map(n=>n.id)).size,89);
  d.nodes.forEach((n,i)=>{assert.match(n.id,/^[a-z0-9]+$/i);assert(Number.isFinite(n.x)&&Number.isFinite(n.y));for(const b of d.nodes.slice(i+1))assert(n.x+n.w<=b.x||b.x+b.w<=n.x||n.y+n.h<=b.y||b.y+b.h<=n.y,'Shapes overlap')});
});
test('multi-page imports namespace IDs and report disconnected lines',()=>{
  const shape={id:'a',class:'DecisionBlock',textAreas:[{text:'Hello <world>'}]};
  const page={items:{shapes:[shape],lines:[{endpoint1:{connectedTo:'a'},endpoint2:{connectedTo:'missing'}}]}};
  const d=importLucidchart({product:'lucidchart',pages:[page,page]});
  assert.equal(d.nodes.length,2);assert.notEqual(d.nodes[0].id,d.nodes[1].id);assert.equal(d.nodes[0].type,'decision');assert.equal(d.nodes[0].text,'Hello <world>');assert.equal(d.edges.length,0);assert.equal(d.warnings.length,1);
});
test('rejects invalid export and duplicate IDs',()=>{
  assert.throws(()=>importLucidchart({product:'lucidchart',pages:[]}));
  assert.throws(()=>importLucidchart({product:'lucidchart',pages:[{items:{shapes:[{id:'a'},{id:'a'}]}}]}));
});
