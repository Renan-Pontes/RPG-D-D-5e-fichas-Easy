import { exportDnd5ePdf } from './export-pdf.js';
import { importDnd5ePdf } from './import-pdf.js';

self.onmessage = async (event) => {
  const { id, op, payload } = event.data || {};
  try {
    if (op === 'export') {
      const bytes = await exportDnd5ePdf(payload.char, payload.lang, payload.opts || {});
      const buf = bytes instanceof Uint8Array ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
      self.postMessage({ id, ok: true, result: buf }, [buf]);
      return;
    }
    if (op === 'import') {
      const res = await importDnd5ePdf(new Uint8Array(payload.buffer));
      self.postMessage({ id, ok: true, result: res });
      return;
    }
    self.postMessage({ id, ok: false, error: `Unknown worker op: ${op}` });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
