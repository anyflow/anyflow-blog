const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/js/image-viewer.js'),'utf8');
function fixture({diagramOnly=false,rendered=true}={}){
 const make=()=>({events:{},attributes:{},children:[],style:{minHeight:''},matches:()=>false,addEventListener(name,fn){this.events[name]=fn;},setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this[name];delete this.attributes[name];},append(...nodes){for(const node of nodes){if(node.parentNode){const siblings=node.parentNode.children;siblings.splice(siblings.indexOf(node),1);}this.children.push(node);node.parentNode=this;}},focus(){this.focused=true;}});
 const photo=Object.assign(make(),{currentSrc:'/assets/original.jpg',src:'/assets/preview.jpg',alt:'사진 설명',closest:()=>null});
 const linked=Object.assign(make(),{closest:()=>({})}),icon=Object.assign(make(),{closest:()=>({})});
 const svg=make(),diagram=Object.assign(make(),{closest:()=>null,matches:()=>true,getBoundingClientRect:()=>({height:300}),querySelector:()=>rendered?svg:null});
 diagram.style.minHeight='12px';if(rendered)diagram.append(svg);
 const body=make(),created=[];
 const document={body,querySelectorAll:()=>diagramOnly?[diagram]:[photo,linked,icon,diagram],createElement(tag){const node=make();if(tag==='dialog'){node.showModal=()=>node.open=true;node.close=()=>{node.open=false;node.events.close();};}created.push(node);return node;}};
 vm.runInNewContext(source,{document});
 return {photo,linked,icon,diagram,svg,dialog:created[0],preview:created[1],close:created[2]};
}
test('image popup uses the original image, closes on click and restores focus without changing links or icons',()=>{
 const f=fixture();f.photo.events.click();assert.equal(f.dialog.open,true);assert.equal(f.preview.src,'/assets/original.jpg');assert.equal(f.preview.alt,'사진 설명');
 assert.equal(f.photo.attributes.role,'button');assert.equal(f.close.attributes['aria-label'],'이미지 닫기');
 f.dialog.events.click();assert.equal(f.dialog.open,false);assert.equal(f.preview.src,undefined);assert.equal(f.photo.focused,true);
 assert.equal(f.linked.events.click,undefined);assert.equal(f.icon.events.click,undefined);
});
test('image popup opens with Enter and Space and leaves other keys alone',()=>{
 const f=fixture();
 for(const key of ['Enter',' ']){let prevented=false;f.photo.events.keydown({key,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.dialog.open,true);f.dialog.close();}
 f.photo.events.keydown({key:'ArrowRight',preventDefault(){assert.fail('must not consume unrelated keys');}});assert.equal(f.dialog.open,false);
});

test('Mermaid opens the same popup with the original SVG and restores diagram layout and focus on close',()=>{
 const f=fixture({diagramOnly:true});f.diagram.events.click();
 assert.equal(f.dialog.open,true);assert.equal(f.svg.parentNode,f.dialog);assert.equal(f.preview.hidden,true);
 assert.equal(f.diagram.style.minHeight,'300px');assert.equal(f.diagram.attributes['aria-label'],'다이어그램 확대');
 f.dialog.events.click();assert.equal(f.svg.parentNode,f.diagram);assert.equal(f.diagram.style.minHeight,'12px');assert.equal(f.diagram.focused,true);
 for(const key of ['Enter',' ']){f.diagram.events.keydown({key,preventDefault(){}});assert.equal(f.dialog.open,true);f.dialog.close();assert.equal(f.diagram.children.filter(n=>n===f.svg).length,1);}
});
test('Mermaid remains usable when rendering finishes after the popup script loads',()=>{
 const f=fixture({diagramOnly:true,rendered:false});f.diagram.events.click();assert.equal(f.dialog.open,undefined);
 f.diagram.append(f.svg);f.diagram.querySelector=()=>f.svg;f.diagram.events.click();assert.equal(f.dialog.open,true);f.dialog.close();assert.equal(f.svg.parentNode,f.diagram);
});
