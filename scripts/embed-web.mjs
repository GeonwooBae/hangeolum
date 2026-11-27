import fs from 'node:fs';
const assets=Object.fromEntries(['index.html','app.js','style.css'].map(n=>[n,fs.readFileSync(new URL('../web/'+n,import.meta.url),'utf8')]));
fs.writeFileSync(new URL('../web/embedded.ts',import.meta.url),'export default '+JSON.stringify(assets)+';\n');
