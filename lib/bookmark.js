const youtubeThumbnail=require('./youtube');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function webUrl(value){
 try{const url=new URL(String(value));return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
module.exports=function bookmark({url,title,description='',cover='',icon=''}){
 const absolute=webUrl(url),relative=/^(?!\/\/)(?:\.{0,2}\/|#|[^:/?#]+\.md(?:[#?]|$))/.test(String(url));
 if(!absolute&&!relative)throw new Error('Invalid bookmark URL');
 const thumbnail=youtubeThumbnail(url),image=webUrl(cover)||thumbnail,favicon=webUrl(icon),domain=absolute?new URL(absolute).hostname.replace(/^www\./,''):url;
 return '<a class="bookmark bookmark-card'+(thumbnail?' youtube-bookmark':'')+'" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer"><div><span class="bookmark-title">'+escape(title||url)+'</span>'+(description?'<span class="bookmark-description">'+escape(description)+'</span>':'')+'<small>'+(favicon?'<img class="bookmark-icon" src="'+escape(favicon)+'" alt="" loading="lazy">':'')+(thumbnail?'YouTube · ':'')+escape(domain)+'</small></div>'+(image?'<img class="bookmark-cover" src="'+escape(image)+'" alt="" loading="lazy">':'')+'</a>\n';
};
