function youtubeThumbnail(raw){
 let url;
 try{url=new URL(raw.startsWith('//')?'https:'+raw:raw);}catch{return '';}
 if(!['https:','http:'].includes(url.protocol))return '';
 const parts=url.pathname.split('/').filter(Boolean);
 const youtube=/^(?:(?:www|m|music)\.)?youtube(?:-nocookie)?\.com$/.test(url.hostname);
 const id=url.hostname==='youtu.be'?parts[0]:youtube?(parts[0]==='watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:''):'';
 return /^[\w-]{11}$/.test(id||'')?'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg':'';
}
module.exports=youtubeThumbnail;
