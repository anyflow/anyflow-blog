const {utils}=require('markdown-it')();
const clean=value=>String(value??'').replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu,'');
const xml=value=>clean(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const plain=html=>utils.unescapeAll(String(html).replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function summary(post){
 if(String(post.summary||'').trim())return String(post.summary).trim();
 const body=String(post.html||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|pre|figure|figcaption|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
 const paragraphs=body.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi)||[body],text=paragraphs.map(plain).find(Boolean)||plain(body),chars=Array.from(text);
 return chars.length>300?chars.slice(0,300).join('')+'…':text;
}
function rss({posts,site,home={}}){
 const absolute=value=>new URL(value,site.url).href;
 const items=posts.filter(p=>p.publish===true&&!p.noindex).sort((a,b)=>new Date(b.created||b.date)-new Date(a.created||a.date)||a.url.localeCompare(b.url)).slice(0,50);
 const latest=Math.max(...items.map(p=>new Date(p.updated||p.created||p.date).valueOf()));
 const lines=['<?xml version="1.0" encoding="UTF-8"?>','<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>',`<title>${xml(home.title||site.title)}</title>`,`<link>${xml(absolute('/'))}</link>`,`<description>${xml(home.summary||site.description)}</description>`,'<language>ko</language>',`<atom:link href="${xml(absolute('/rss.xml'))}" rel="self" type="application/rss+xml"/>`];
 if(Number.isFinite(latest))lines.push(`<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>`);
 for(const post of items){
  const url=absolute(post.url),date=new Date(post.created||post.date);if(Number.isNaN(date.valueOf()))throw new Error('Invalid RSS publication date: '+post.url);
  let image='';const candidate=post.ogImage||post.thumbnail||post.cover;
  if(candidate){const imageUrl=new URL(candidate,site.url);if(['https:','http:'].includes(imageUrl.protocol))image=`<p><img src="${xml(imageUrl.href)}" alt=""/></p>`;}
  const description=image+`<p>${xml(summary(post))}</p><p><a href="${xml(url)}">원문 읽기</a></p>`;
  lines.push('<item>',`<title>${xml(post.title)}</title>`,`<link>${xml(url)}</link>`,`<guid isPermaLink="true">${xml(url)}</guid>`,`<pubDate>${date.toUTCString()}</pubDate>`,`<description>${xml(description)}</description>`);
  for(const category of new Set([post.category,...(post.tags||[]).map(t=>String(t).replace(/[-\s]+/g,' ').trim())].filter(Boolean)))lines.push(`<category>${xml(category)}</category>`);
  lines.push('</item>');
 }
 lines.push('</channel></rss>');return lines.join('\n');
}
module.exports={rss,summary};
