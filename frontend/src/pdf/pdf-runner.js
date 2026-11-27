let nextReqId = 1;

function runInWorker(op, payload, transfer = []) {
  if (typeof Worker === 'undefined') return null;
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./pdf.worker.js', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    const id = nextReqId++;
    const cleanup = () => { try { worker.terminate(); } catch { /* ignore */ } };
    worker.onmessage = (e) => {
      cleanup();
      if (e.data?.id !== id) return;
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error || 'pdf_worker_failed'));
    };
    worker.onerror = (err) => {
      cleanup();
      reject(err);
    };
    worker.postMessage({ id, op, payload }, transfer);
  });
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function runExportPdf(char, lang = 'pt', opts = {}) {
  const { speciesSummary, ...workerOpts } = opts;
  const workerSupported = typeof Worker !== 'undefined' && !opts.customHooks;
  if (workerSupported) {
    try {
      const buf = await runInWorker('export', { char, lang, opts: workerOpts });
      if (buf) {
        const bytes = new Uint8Array(buf);
        const safe = (char?.name || 'ficha').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 48) || 'ficha';
        triggerDownload(bytes, `${safe}.pdf`);
        return true;
      }
    } catch { /* fallback to main thread */ }
  }
  const { downloadDnd5ePdf } = await import('./export-pdf.js');
  await downloadDnd5ePdf(char, lang, opts);
  return true;
}

export async function runImportPdf(arrayBuffer) {
  if (typeof Worker !== 'undefined') {
    try {
      const copy = arrayBuffer.slice(0);
      const res = await runInWorker('import', { buffer: copy }, [copy]);
      if (res) return res;
    } catch { /* fallback to main thread */ }
  }
  const { importDnd5ePdf } = await import('./import-pdf.js');
  return importDnd5ePdf(new Uint8Array(arrayBuffer));
}
