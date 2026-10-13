module.exports=function isNotionMetadata(block) {
 if(block.type!=="code")return false;
 const code=(block.properties?.title||[]).map(x=>x[0]).join("");
 return /(?:^|\n)cleanUrl:[^\n]*(?:\n|$)/.test(code)&&/(?:^|\n)(?:title|description|floatFirstTOC):/.test(code)
  || /^\s*<head>\s*<meta\s+name=["']robots["']\s+content=["']noindex["']\s*\/?>\s*<\/head>\s*$/i.test(code);
};
