import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import HTMLtoDOCX from 'html-to-docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <h1>Test Guide Agent</h1>
      <p>Ceci est un test de document Word simple.</p>
    </body>
    </html>
  `;
  
  const buffer = await HTMLtoDOCX(html);
  fs.writeFileSync(path.join(__dirname, '../guides/test_simple.docx'), buffer);
  console.log('Simple DOCX generated!');
}

test().catch(console.error);
