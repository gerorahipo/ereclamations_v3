import fs from 'fs';

const filePath = 'c:/Apps/projets/antigravity/ereclamations/frontend/generate_guides_docx.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all occurrences of " & " with " &amp; "
content = content.replaceAll(' & ', ' &amp; ');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Remplacement des esperluettes terminé avec succès !');
