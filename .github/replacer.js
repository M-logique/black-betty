const fs = require('fs');

let content = fs.readFileSync('wrangler.toml', 'utf8');

for (const [k, v] of Object.entries(process.env)) {
  if (content.includes(`\${${k}}`)) {
    console.log(`Replacing ${k} with ${v}`);
    content = content.replace(new RegExp(`\\${'${'}${k}}`, 'g'), v);
  } else {
    console.log(`\${${k}} not found in wrangler.toml`);
  }
}

fs.writeFileSync('wrangler.toml', content); 