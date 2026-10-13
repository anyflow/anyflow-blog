#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {exportPublic}=require('../lib/comments/export');
if(require.main===module)exportPublic(path.resolve(process.argv[2]||process.env.COMMENTS_DATA_DIR||'.cache/blog-comments'),{approveMerged:process.argv.includes('--approve-merged')}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
