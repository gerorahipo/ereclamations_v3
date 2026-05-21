const fs = require('fs');
const imagePath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\2c964a70-bc25-4a85-86d7-e3de22c71ee2\\media__1778101417615.png';
const outputPath = 'c:\\Apps\\projets\\antigravity\\ereclamations\\frontend\\src\\assets\\logo.js';

try {
    const data = fs.readFileSync(imagePath);
    const base64 = data.toString('base64');
    fs.writeFileSync(outputPath, `export const LOGO_CNPS = "data:image/png;base64,${base64}";\n`);
    console.log('Logo generated successfully');
} catch (err) {
    console.error('Error generating logo:', err);
    process.exit(1);
}
