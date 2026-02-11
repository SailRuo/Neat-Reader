const B=c=>c?c.replace(/[\t\n\f\r ]+/g," ").replace(/^[\t\n\f\r ]+/,"").replace(/[\t\n\f\r ]+$/,""):"",d=c=>B(c?.textContent),S={XLINK:"http://www.w3.org/1999/xlink",EPUB:"http://www.idpf.org/2007/ops"},T={XML:"application/xml",XHTML:"application/xhtml+xml"},p={strong:["strong","self"],emphasis:["em","self"],style:["span","self"],a:"anchor",strikethrough:["s","self"],sub:["sub","self"],sup:["sup","self"],code:["code","self"],image:"image"},E={tr:["tr",{th:["th",p,["colspan","rowspan","align","valign"]],td:["td",p,["colspan","rowspan","align","valign"]]},["align"]]},M={epigraph:["blockquote"],subtitle:["h2",p],"text-author":["p",p],date:["p",p],stanza:"stanza"},L={title:["header",{p:["h1",p],"empty-line":["br"]}],epigraph:["blockquote","self"],image:"image",annotation:["aside"],section:["section","self"],p:["p",p],poem:["blockquote",M],subtitle:["h2",p],cite:["blockquote","self"],"empty-line":["br"],table:["table",E],"text-author":["p",p]};M.epigraph.push(L);const D={image:"image",title:["section",{p:["h1",p],"empty-line":["br"]}],epigraph:["section",L],section:["section",L]},N=c=>{const t=c.getAttributeNS(S.XLINK,"href");if(!t)return"data:,";const[,o]=t.split("#");if(!o)return t;const s=c.getRootNode().getElementById(o);return s?`data:${s.getAttribute("content-type")};base64,${s.textContent}`:t};class ${constructor(t){this.fb2=t,this.doc=document.implementation.createDocument(S.XHTML,"html")}image(t){const o=this.doc.createElement("img");return o.alt=t.getAttribute("alt"),o.title=t.getAttribute("title"),o.setAttribute("src",N(t)),o}anchor(t){const o=this.convert(t,{a:["a",p]});return o.setAttribute("href",t.getAttributeNS(S.XLINK,"href")),t.getAttribute("type")==="note"&&o.setAttributeNS(S.EPUB,"epub:type","noteref"),o}stanza(t){const o=this.convert(t,{stanza:["p",{title:["header",{p:["strong",p],"empty-line":["br"]}],subtitle:["p",p]}]});for(const s of t.children)s.nodeName==="v"&&(o.append(this.doc.createTextNode(s.textContent)),o.append(this.doc.createElement("br")));return o}convert(t,o){if(t.nodeType===3)return this.doc.createTextNode(t.textContent);if(t.nodeType===4)return this.doc.createCDATASection(t.textContent);if(t.nodeType===8)return this.doc.createComment(t.textContent);const s=o?.[t.nodeName];if(!s)return null;if(typeof s=="string")return this[s](t);const[l,u,m]=s,f=this.doc.createElement(l);if(t.id&&(f.id=t.id),f.classList.add(t.nodeName),Array.isArray(m))for(const g of m){const A=t.getAttribute(g);A&&f.setAttribute(g,A)}const w=u==="self"?o:u;let y=t.firstChild;for(;y;){const g=this.convert(y,w);g&&f.append(g),y=y.nextSibling}return f}}const O=async c=>{const t=await c.arrayBuffer(),o=new TextDecoder("utf-8").decode(t),s=new DOMParser,l=s.parseFromString(o,T.XML),u=l.xmlEncoding||o.match(/^<\?xml\s+version\s*=\s*["']1.\d+"\s+encoding\s*=\s*["']([A-Za-z0-9._-]*)["']/)?.[1];if(u&&u.toLowerCase()!=="utf-8"){const m=new TextDecoder(u).decode(t);return s.parseFromString(m,T.XML)}return l},X=URL.createObjectURL(new Blob([`
@namespace epub "http://www.idpf.org/2007/ops";
body > img, section > img {
    display: block;
    margin: auto;
}
.title h1 {
    text-align: center;
}
body > section > .title, body.notesBodyType > .title {
    margin: 3em 0;
}
body.notesBodyType > section .title h1 {
    text-align: start;
}
body.notesBodyType > section .title {
    margin: 1em 0;
}
p {
    text-indent: 1em;
    margin: 0;
}
:not(p) + p, p:first-child {
    text-indent: 0;
}
.poem p {
    text-indent: 0;
    margin: 1em 0;
}
.text-author, .date {
    text-align: end;
}
.text-author:before {
    content: "—";
}
table {
    border-collapse: collapse;
}
td, th {
    padding: .25em;
}
a[epub|type~="noteref"] {
    font-size: .75em;
    vertical-align: super;
}
body:not(.notesBodyType) > .title, body:not(.notesBodyType) > .epigraph {
    margin: 3em 0;
}
`],{type:"text/css"})),z=c=>`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head><link href="${X}" rel="stylesheet" type="text/css"/></head>
    <body>${c}</body>
</html>`,C="data-foliate-id",I=async c=>{const t={},o=await O(c),s=new $(o),l=e=>o.querySelector(e),u=e=>[...o.querySelectorAll(e)],m=e=>{const n=d(e.querySelector("nickname"));if(n)return n;const r=d(e.querySelector("first-name")),i=d(e.querySelector("middle-name")),a=d(e.querySelector("last-name")),h=[r,i,a].filter(b=>b).join(" "),x=a?[a,[r,i].filter(b=>b).join(" ")].join(", "):null;return{name:h,sortAs:x}},f=e=>e?.getAttribute("value")??d(e),w=l("title-info annotation");if(t.metadata={title:d(l("title-info book-title")),identifier:d(l("document-info id")),language:d(l("title-info lang")),author:u("title-info author").map(m),translator:u("title-info translator").map(m),contributor:u("document-info author").map(m).concat(u("document-info program-used").map(d)).map(e=>Object.assign(typeof e=="string"?{name:e}:e,{role:"bkp"})),publisher:d(l("publish-info publisher")),published:f(l("title-info date")),modified:f(l("document-info date")),description:w?s.convert(w,{annotation:["div",L]}).innerHTML:null,subject:u("title-info genre").map(d)},l("coverpage image")){const e=N(l("coverpage image"));t.getCover=()=>fetch(e).then(n=>n.blob())}else t.getCover=()=>null;const y=Array.from(o.querySelectorAll("body"),e=>{const n=s.convert(e,{body:["body",D]});return[Array.from(n.children,r=>{const i=[r,...r.querySelectorAll("[id]")].map(a=>a.id);return{el:r,ids:i}}),n]}),g=[],A=y[0][0].map(({el:e,ids:n})=>{const r=Array.from(e.querySelectorAll(":scope > section > .title"),(i,a)=>(i.setAttribute(C,a),{title:d(i),index:a}));return{ids:n,titles:r,el:e}}).concat(y.slice(1).map(([e,n])=>{const r=e.map(i=>i.ids).flat();return n.classList.add("notesBodyType"),{ids:r,el:n,linear:"no"}})).map(({ids:e,titles:n,el:r,linear:i})=>{const a=z(r.outerHTML),h=new Blob([a],{type:T.XHTML}),x=URL.createObjectURL(h);g.push(x);const b=B(r.querySelector(".title, .subtitle, p")?.textContent??(r.classList.contains("title")?r.textContent:""));return{ids:e,title:b,titles:n,load:()=>x,createDocument:()=>new DOMParser().parseFromString(a,T.XHTML),size:h.size-Array.from(r.querySelectorAll("[src]"),v=>v.getAttribute("src")?.length??0).reduce((v,k)=>v+k,0),linear:i}}),q=new Map;return t.sections=A.map((e,n)=>{const{ids:r,load:i,createDocument:a,size:h,linear:x}=e;for(const b of r)b&&q.set(b,n);return{id:n,load:i,createDocument:a,size:h,linear:x}}),t.toc=A.map(({title:e,titles:n},r)=>{const i=r.toString();return{label:e,href:i,subitems:n?.length?n.map(({title:a,index:h})=>({label:a,href:`${i}#${h}`})):null}}).filter(e=>e),t.resolveHref=e=>{const[n,r]=e.split("#");return n?{index:Number(n),anchor:i=>i.querySelector(`[${C}="${r}"]`)}:{index:q.get(r),anchor:i=>i.getElementById(r)}},t.splitTOCHref=e=>e?.split("#")?.map(n=>Number(n))??[],t.getTOCFragment=(e,n)=>e.querySelector(`[${C}="${n}"]`),t.destroy=()=>{for(const e of g)URL.revokeObjectURL(e)},t};export{I as makeFB2};
