// scripts/fix-encoding.js
// Normaliza data/products.json a UTF-8 sin BOM con line endings LF.
// No modifica strings (el archivo ya esta en UTF-8 correcto). Solo limpia
// formato para que webpack lo procese consistentemente.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'products.json');
const raw = fs.readFileSync(FILE);

// Quitar BOM si existe.
let text = raw.toString('utf-8');
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
  console.log('BOM removed');
}

// Normalizar CRLF -> LF.
const before = text.length;
text = text.replace(/\r\n/g, '\n');
if (text.length !== before) {
  console.log('Line endings normalized CRLF -> LF');
}

// Parsear y re-stringificar para asegurar formato canonico.
const data = JSON.parse(text);
const fixed = JSON.stringify(data, null, 2) + '\n';

// Solo escribimos si hay cambios reales.
if (fixed !== raw.toString('utf-8').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')) {
  fs.copyFileSync(FILE, FILE + '.bak');
  fs.writeFileSync(FILE, fixed, 'utf-8');
  console.log('OK - file rewritten');
  console.log('  Backup: ' + FILE + '.bak');
} else {
  console.log('OK - no changes needed');
}

console.log('  Size: ' + fs.statSync(FILE).size + ' bytes');

// Sanity check.
console.log('\nSample strings (verificacion):');
console.log('  ' + data[0].shortDescription);
console.log('  ' + data[0].specs.movement);
console.log('  ' + data[0].specs.caseMaterial);

