// Stable identities connect the publication, its pages, and original issue articles.
export function pageGraph({config,title,description,path='',schema,social,issues=[]}) {
 const absolute=p=>new URL(p,config.url).href;
 const canonical=absolute(path);
 const orgId=absolute('#organization'),siteId=absolute('#website');
 const personId=new URL('#damian-makki',config.author.url).href;
 const pageId=`${canonical}#webpage`;
 const article=schema?.['@type']==='Article';
 const organization={'@type':'Organization','@id':orgId,name:config.name,url:config.url,
  logo:{'@type':'ImageObject',url:absolute('assets/images/verycool.png'),width:168,height:170}};
 const profiles=[config.subscription.publicationUrl,config.social?.x].filter(Boolean);
 if(profiles.length)organization.sameAs=profiles;
 const page={'@type':path==='archive/'?'CollectionPage':'WebPage','@id':pageId,url:canonical,name:title,description,
  inLanguage:'en-US',isPartOf:{'@id':siteId},publisher:{'@id':orgId},
  primaryImageOfPage:{'@type':'ImageObject',url:social}};
 const graph=[organization,{'@type':'Person','@id':personId,name:config.author.name,url:config.author.url},
  {'@type':'WebSite','@id':siteId,url:config.url,name:config.name,description:config.description,inLanguage:'en-US',publisher:{'@id':orgId}},page];
 if(article){
  page.mainEntity={'@id':`${canonical}#article`};
  graph.push({...schema,'@id':`${canonical}#article`,url:canonical,inLanguage:'en-US',
   author:{'@id':personId},publisher:{'@id':orgId},isPartOf:{'@id':siteId},mainEntityOfPage:{'@id':pageId}});
 }
 if(path==='archive/'){
  page.mainEntity={'@id':`${canonical}#editions`};
  graph.push({'@type':'ItemList','@id':`${canonical}#editions`,name:'Very Cool Weekly editions',numberOfItems:issues.length,
   itemListElement:issues.map((issue,index)=>({'@type':'ListItem',position:index+1,name:issue.title,url:absolute(`${issue.slug}/`)}))});
 }
 return {'@context':'https://schema.org','@graph':graph};
}
export const serializeGraph=value=>JSON.stringify(value).replace(/</g,'\\u003c');
