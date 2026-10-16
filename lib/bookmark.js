const youtubeThumbnail=require('./youtube');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function webUrl(value){
 try{const url=new URL(String(value));return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
function imageUrl(value,resolveImage){
 const remote=webUrl(value);if(remote)return remote;
 if(!value||!resolveImage||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value))return '';
 const local=resolveImage(value);return /^\/assets\//.test(local)?local:'';
}
module.exports=function bookmark({url,title,description='',cover='',icon=''},{resolveImage}={}){
 const absolute=webUrl(url),relative=/^(?!\/\/)(?:\.{0,2}\/|#|[^:/?#]+\.md(?:[#?]|$))/.test(String(url));
 if(!absolute&&!relative)throw new Error('Invalid bookmark URL');
 const thumbnail=youtubeThumbnail(url),image=imageUrl(cover,resolveImage)||thumbnail,favicon=imageUrl(icon,resolveImage);
 const media=image?'<div class="bookmark-media" aria-hidden="true"><img class="bookmark-cover" src="'+escape(image)+'" alt="" loading="lazy"></div>':'';
 return '<a class="bookmark bookmark-card'+(thumbnail?' youtube-bookmark':'')+'" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer"><div class="bookmark-content"><div class="bookmark-main"><span class="bookmark-title">'+escape(title||url)+'</span><span class="bookmark-description">'+escape(description)+'</span></div><small class="bookmark-url">'+(favicon?'<img class="bookmark-icon" src="'+escape(favicon)+'" alt="" loading="lazy">':'')+'<span class="bookmark-url-text">'+escape(url)+'</span></small></div>'+media+'</a>\n';
};
