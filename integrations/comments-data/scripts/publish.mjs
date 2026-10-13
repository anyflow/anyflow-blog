import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {exportPublic}=require('../lib/comments/export');
const run=promisify(execFile);
const repository=process.env.COMMENTS_REPOSITORY,branch=process.env.COMMENTS_EVENT_BRANCH||'main';
if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!process.env.GH_TOKEN)throw new Error('Repository and GitHub token are required.');
const git=async(...args)=>(await run('git',args,{maxBuffer:16*1024*1024})).stdout.trim();
async function api(route,method='GET',body){
  const response=await fetch('https://api.github.com/repos/'+repository+route,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+process.env.GH_TOKEN,'X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw new Error('GitHub '+method+' '+route.split('?')[0]+': '+response.status+' '+String(data.message||''));
  return data;
}
await git('config','user.name','github-actions[bot]');
await git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
if(branch.startsWith('incoming/')){
  const id=branch.slice('incoming/'.length);
  if(!/^[A-Za-z0-9_-]{1,256}$/.test(id))throw new Error('Invalid comment request branch.');
  await git('fetch','origin',branch);
  const head=await git('rev-parse','FETCH_HEAD');
  const request=JSON.parse(await git('show',head+':requests/'+id+'.json'));
  const comment=JSON.parse(await git('show',head+':comments/'+id+'.json'));
  if(comment.id!==id||request.comment_id!==id)throw new Error('Request and comment identifiers differ.');
  const owner=repository.split('/')[0];
  const prs=await api('/pulls?state=open&base=main&head='+encodeURIComponent(owner+':'+branch));
  let pr=prs[0];
  if(comment.status==='deleted'){
    if(pr)await api('/pulls/'+pr.number,'PATCH',{state:'closed'});
    console.log('Unpublished deleted request retained privately.');
    process.exit(0);
  }
  if(!pr){
    const title=('새 댓글: '+(request.title||comment.post_id)+' — '+(comment.author?.name||'이름 없음')).replace(/[\r\n]/g,' ').slice(0,240);
    const body='글: '+String(request.title||comment.post_id)+'\n\n작성자: '+String(comment.author?.name||'이름 없음')+'\n\n'+String(comment.body||'').split('\n').map(line=>'> '+line.replace(/@/g,'＠')).join('\n')+'\n\n글 주소: '+String(request.post_url||'')+'#comment-'+id+'\n\n승인 설정이 꺼져 있으면 자동 게시합니다. 켜져 있으면 이 PR을 merge하여 게시합니다.';
    pr=await api('/pulls','POST',{title,head:branch,base:'main',body});
  }
  const settings=JSON.parse(await readFile('settings.json','utf8'));
  if(settings.moderation===true&&comment.status!=='published'){
    console.log('Comment awaiting review: PR #'+pr.number);
    process.exit(0);
  }
  let merged;
  for(let attempt=0;attempt<4;attempt++){
    try{merged=await api('/pulls/'+pr.number+'/merge','PUT',{sha:head,merge_method:'squash'});break;}
    catch(error){if(attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
  }
  if(!merged?.merged)throw new Error('Comment pull request was not merged.');
}
// GITHUB_TOKEN merges do not start another workflow. Export in this same run.
for(let attempt=0;attempt<4;attempt++){
  await git('fetch','origin','main');
  await git('reset','--hard','origin/main');
  const result=await exportPublic(process.cwd(),{approveMerged:true});
  await git('add','--all');
  if(!await git('diff','--cached','--name-only')){console.log(JSON.stringify(result));break;}
  await git('commit','-m','Publish sanitized comments [skip ci]');
  try{await git('push','origin','HEAD:main');console.log(JSON.stringify(result));break;}
  catch(error){if(attempt===3)throw error;}
}
