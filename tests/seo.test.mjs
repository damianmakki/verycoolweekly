import test from 'node:test';
import assert from 'node:assert/strict';
import {pageGraph,serializeGraph} from '../scripts/seo.mjs';
const config={name:'Very Cool Weekly',url:'https://ruckuslabs.co/verycoolweekly/',description:'Independent design and development picks.',author:{name:'Damian Makki',url:'https://ruckuslabs.co/'},subscription:{publicationUrl:'https://verycoolweekly.substack.com/'}};
const base={config,title:'Test page',description:'Page description',social:`${config.url}assets/images/social-card.png`};
function checkReferences(data){
 const ids=new Set(data['@graph'].map(node=>node['@id']));
 function walk(value){if(!value||typeof value!=='object')return;if(Object.keys(value).length===1&&value['@id'])assert.ok(ids.has(value['@id']),`Unresolved reference: ${value['@id']}`);for(const child of Object.values(value))walk(child);}
 walk(data);
}
test('all page types share stable publication, website and author identities',()=>{
 for(const path of ['','signup/','sponsor/','disclosure/']){
  const data=pageGraph({...base,path});checkReferences(data);
  const page=data['@graph'].find(x=>x['@type']==='WebPage');
  assert.equal(page.url,new URL(path,config.url).href);
  assert.equal(data['@graph'].find(x=>x['@type']==='Organization').logo.url,`${config.url}assets/images/verycool.png`);
 }
});
test('article metadata preserves its original date and connects to its canonical page',()=>{
 const data=pageGraph({...base,path:'issue-one/',schema:{'@type':'Article',headline:'Issue One',datePublished:'2017-04-21',isAccessibleForFree:true,image:[`${config.url}assets/hero.webp`]}});checkReferences(data);
 const article=data['@graph'].find(x=>x['@type']==='Article');
 assert.equal(article.datePublished,'2017-04-21');assert.equal(article.dateModified,undefined);
 assert.equal(article.mainEntityOfPage['@id'],`${config.url}issue-one/#webpage`);
});
test('archive metadata lists only supplied eligible issues and JSON-LD cannot close its script',()=>{
 const data=pageGraph({...base,title:'Example </script>',path:'archive/',issues:[{slug:'issue-one',title:'Issue One'}]});checkReferences(data);
 const list=data['@graph'].find(x=>x['@type']==='ItemList');
 assert.equal(list.numberOfItems,1);assert.equal(list.itemListElement[0].url,`${config.url}issue-one/`);
 const serialized=serializeGraph(data);assert.ok(!serialized.includes('</script>'));assert.deepEqual(JSON.parse(serialized),data);
});
