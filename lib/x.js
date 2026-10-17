function xPostId(raw){
 try{
  let url=new URL(raw.replaceAll('&amp;','&'));
  if(url.hostname==='embed.notion.co'&&url.pathname==='/api/iframe')url=new URL(url.searchParams.get('url'));
  if(url.protocol==='https:'&&url.hostname==='platform.twitter.com'&&url.pathname==='/embed/Tweet.html')return /^\d+$/.test(url.searchParams.get('id')||'')?url.searchParams.get('id'):'';
  if(!['http:','https:'].includes(url.protocol)||!/^(?:(?:www|mobile|m)\.)?(?:x|twitter)\.com$/.test(url.hostname))return '';
  return /\/status\/(\d+)(?:\/|$)/.exec(url.pathname)?.[1]||'';
 }catch{return '';}
}
async function xThumbnail(id,requestJSON){
 // shortcut: X의 공개 임베드 응답 형식에 의존한다. 형식이 바뀌면 공식 API 연동을 검토한다.
 const token=((Number(id)/1e15)*Math.PI).toString(36).replace(/(0+|\.)/g,'');
 const url='https://cdn.syndication.twimg.com/tweet-result?id='+encodeURIComponent(id)+'&lang=en&token='+token;
 let timer,data;
 try{data=await Promise.race([requestJSON(url),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('X 이미지 조회 시간 초과')),8000);})]);}finally{clearTimeout(timer);}
 if(data?.id_str!==id)throw new Error('X 게시물을 확인할 수 없습니다.');
 const image=data.photos?.[0]?.url||data.mediaDetails?.[0]?.media_url_https||data.video?.poster;
 if(!image)return null;
 const parsed=new URL(image);
 if(parsed.protocol!=='https:'||parsed.hostname!=='pbs.twimg.com')throw new Error('잘못된 X 이미지 주소');
 return parsed.href;
}
module.exports={xPostId,xThumbnail};
