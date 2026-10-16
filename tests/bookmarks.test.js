const test=require('node:test'),assert=require('node:assert/strict'),bookmark=require('../lib/bookmark');
test('bookmark variants preserve full safe URLs and previews without inventing footer labels',()=>{
 const url='https://www.example.com/path?q=1&x=2#part';
 const html=bookmark({url,title:'A <title>',description:'Text & more',cover:'https://example.com/cover.png',icon:'https://example.com/icon.png'});
 assert.match(html,/class="bookmark bookmark-card"/);assert.match(html,/class="bookmark-url-text">https:\/\/www\.example\.com\/path\?q=1&amp;x=2#part<\/span>/);assert.match(html,/A &lt;title&gt;/);assert.equal((html.match(/class="bookmark-icon"/g)||[]).length,1);assert.match(html,/class="bookmark-media" aria-hidden="true"><img class="bookmark-cover"/);
 const video=bookmark({url:'https://youtu.be/yonRGtMDDH8?si=test',title:'Video'});
 assert.match(video,/youtube-bookmark/);assert.match(video,/class="bookmark-description"><\/span>/);assert.match(video,/class="bookmark-url-text">https:\/\/youtu\.be\/yonRGtMDDH8\?si=test<\/span>/);assert.doesNotMatch(video,/YouTube ·/);assert.match(video,/https:\/\/i\.ytimg\.com\/vi\/yonRGtMDDH8\/hqdefault.jpg/);
 const playlist=bookmark({url:'https://www.youtube.com/playlist?list=example',title:'Playlist',cover:'https://example.com/playlist.png'});assert.match(playlist,/youtube-bookmark/);assert.match(playlist,/playlist.png/);assert.doesNotMatch(bookmark({url:'https://youtube.com.evil.test/watch?v=yonRGtMDDH8'}),/youtube-bookmark/);
 const text=bookmark({url,title:'No preview',cover:'javascript:alert(1)',icon:'data:image/png,unsafe'});assert.doesNotMatch(text,/<img|bookmark-media/);assert.throws(()=>bookmark({url:'javascript:alert(1)'}),/Invalid bookmark/);
});
