/**
 * Pure-JS PDF Standard Security Handler (V=1, R=2, 40-bit RC4).
 * Works without external binaries or native modules.
 * Targets the specific format produced by pdf-lib with useObjectStreams:false.
 */
const crypto = require('crypto');

// Standard PDF password padding string (PDF spec §3.3.3)
const PADDING = Buffer.from([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
]);

function padPwd(pwd) {
  const b = Buffer.from(pwd || '', 'latin1');
  const out = Buffer.alloc(32);
  const n = Math.min(b.length, 32);
  b.copy(out, 0, 0, n);
  PADDING.copy(out, n, 0, 32 - n);
  return out;
}

function md5(data) {
  return crypto.createHash('md5').update(data).digest();
}

// Pure JavaScript RC4 — works on any Node.js version
function rc4(key, data) {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xFF;
    const t = S[i]; S[i] = S[j]; S[j] = t;
  }
  const out = Buffer.alloc(data.length);
  let x = 0, y = 0;
  for (let i = 0; i < data.length; i++) {
    x = (x + 1) & 0xFF;
    y = (y + S[x]) & 0xFF;
    const t = S[x]; S[x] = S[y]; S[y] = t;
    out[i] = data[i] ^ S[(S[x] + S[y]) & 0xFF];
  }
  return out;
}

// Compute /O entry: RC4(MD5(ownerPwd)[0:5], padded(userPwd))
function computeO(userPwd, ownerPwd) {
  const ownerKey = md5(padPwd(ownerPwd)).slice(0, 5);
  return rc4(ownerKey, padPwd(userPwd));
}

// Compute encryption key: MD5(padded(userPwd) + O + P_bytes + fileId)[0:5]
function computeEncKey(userPwd, O, permissions, fileId) {
  const p = Buffer.alloc(4);
  p.writeInt32LE(permissions, 0);
  return md5(Buffer.concat([padPwd(userPwd), O, p, fileId])).slice(0, 5);
}

// Compute /U entry: RC4(encKey, padding)
function computeU(key) {
  return rc4(key, PADDING);
}

// Per-object encryption key: MD5(encKey + low3(objNum) + low2(genNum))[0:keyLen+5]
function objectKey(encKey, objNum, genNum) {
  const n = Buffer.alloc(3);
  n.writeUIntLE(objNum & 0xFFFFFF, 0, 3);
  const g = Buffer.alloc(2);
  g.writeUIntLE(genNum & 0xFFFF, 0, 2);
  return md5(Buffer.concat([encKey, n, g])).slice(0, Math.min(encKey.length + 5, 16));
}

function toHex(buf) {
  return buf.toString('hex').toUpperCase();
}

/**
 * Encrypt a pdf-lib generated PDF buffer with a user password.
 * The PDF must be saved with useObjectStreams:false.
 */
function encryptPdf(pdfBuf, userPwd, ownerPwd) {
  if (!(pdfBuf instanceof Buffer)) pdfBuf = Buffer.from(pdfBuf);

  const fileId     = crypto.randomBytes(16);
  const permissions = -3904; // print allowed, copy/modify disallowed
  const O          = computeO(userPwd, ownerPwd);
  const encKey     = computeEncKey(userPwd, O, permissions, fileId);
  const U          = computeU(encKey);

  // Work in latin1 so binary bytes survive string operations
  const pdfStr = pdfBuf.toString('latin1');

  // Locate all "N G obj … endobj" blocks
  const objRegex = /^(\d+)\s+(\d+)\s+obj\b/mg;
  let m;
  const objects = [];
  while ((m = objRegex.exec(pdfStr)) !== null) {
    const num = parseInt(m[1]);
    const gen = parseInt(m[2]);
    const start = m.index;
    const endobjIdx = pdfStr.indexOf('\nendobj', start);
    if (endobjIdx === -1) continue;
    const end = endobjIdx + '\nendobj'.length;
    objects.push({ num, gen, start, end });
  }

  if (objects.length === 0) throw new Error('No PDF objects found');

  // Rebuild PDF, encrypting every content stream
  const offsets = {};
  let output = Buffer.alloc(0);

  // Copy PDF header (everything before first object)
  output = Buffer.concat([output, pdfBuf.slice(0, objects[0].start)]);
  let lastEnd = objects[0].start;

  for (const obj of objects) {
    // Copy whitespace/gap between previous object and this one
    output = Buffer.concat([output, pdfBuf.slice(lastEnd, obj.start)]);
    offsets[obj.num] = output.length;

    const objStr = pdfStr.slice(obj.start, obj.end);

    // Detect stream: look for "\nstream\n" or "\nstream\r\n" within the object
    const streamMarkerIdx = objStr.search(/\nstream\r?\n/);
    if (streamMarkerIdx !== -1) {
      // Find where stream data begins (after "stream\n" or "stream\r\n")
      const nlAfterStream = objStr.indexOf('\n', streamMarkerIdx + 1);
      const streamDataStart = nlAfterStream + 1;

      // Find end of stream data ("\nendstream")
      const endstreamIdx = objStr.indexOf('\nendstream', streamDataStart);
      if (endstreamIdx !== -1) {
        const absStart = obj.start + streamDataStart;
        const absEnd   = obj.start + endstreamIdx;
        const streamData = pdfBuf.slice(absStart, absEnd);

        // Encrypt stream
        const sk       = objectKey(encKey, obj.num, obj.gen);
        const encData  = rc4(sk, streamData);

        // Update /Length and reassemble
        const dictPart   = objStr.slice(0, streamDataStart);
        const newDict    = dictPart.replace(/\/Length\s+\d+/, `/Length ${encData.length}`);
        const afterPart  = objStr.slice(endstreamIdx); // '\nendstream\nendobj'

        output = Buffer.concat([
          output,
          Buffer.from(newDict,   'latin1'),
          encData,
          Buffer.from(afterPart, 'latin1'),
        ]);
        lastEnd = obj.end;
        continue;
      }
    }

    // Non-stream object — copy verbatim
    output = Buffer.concat([output, pdfBuf.slice(obj.start, obj.end)]);
    lastEnd = obj.end;
  }

  // Append gap after last object
  output = Buffer.concat([output, Buffer.from('\n', 'latin1')]);

  // Add /Encrypt object
  const encObjNum = objects.reduce((mx, o) => Math.max(mx, o.num), 0) + 1;
  offsets[encObjNum] = output.length;
  const encryptObjStr =
    `${encObjNum} 0 obj\n` +
    `<<\n/Filter /Standard\n/V 1\n/R 2\n` +
    `/O <${toHex(O)}>\n/U <${toHex(U)}>\n/P ${permissions}\n` +
    `>>\nendobj\n`;
  output = Buffer.concat([output, Buffer.from(encryptObjStr, 'latin1')]);

  // Build xref table
  const totalObjs = encObjNum + 1;
  const xrefOffset = output.length;
  let xref = `xref\n0 ${totalObjs}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < totalObjs; i++) {
    const off   = offsets[i] !== undefined ? offsets[i] : 0;
    const inuse = offsets[i] !== undefined ? 'n' : 'f';
    xref += `${String(off).padStart(10, '0')} 00000 ${inuse} \n`;
  }

  // Extract old trailer dict and extend it
  const xrefSectionStart = pdfStr.lastIndexOf('\nxref\n');
  const trailerSection   = xrefSectionStart !== -1 ? pdfStr.slice(xrefSectionStart) : '';
  const trailerMatch     = trailerSection.match(/trailer\s*<<([\s\S]*?)>>/);
  let trailerContent     = trailerMatch ? trailerMatch[1] : `\n/Size ${totalObjs}\n/Root 2 0 R\n`;

  trailerContent = trailerContent.replace(/\/Size\s+\d+/, `/Size ${totalObjs}`);
  // Remove any existing /ID so we can add our own
  trailerContent = trailerContent.replace(/\/ID\s*\[.*?\]/s, '');
  trailerContent += `\n/Encrypt ${encObjNum} 0 R\n/ID [<${toHex(fileId)}> <${toHex(fileId)}>]`;

  const trailer =
    `trailer\n<<${trailerContent}>>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  output = Buffer.concat([output, Buffer.from(xref + trailer, 'latin1')]);
  return output;
}

module.exports = { encryptPdf };
