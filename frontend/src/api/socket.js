// Wrapper opcional de socket.io-client. Carrega o módulo via CDN para não
// precisar adicionar dependência ao package.json do frontend.
// Em produção, considere instalar socket.io-client localmente.

import { API_BASE } from './client.js';

let cachedIo = null;
let loadingPromise = null;

async function loadIo() {
  if (cachedIo) return cachedIo;
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    if (window.io) {
      cachedIo = window.io;
      return resolve(cachedIo);
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      cachedIo = window.io;
      resolve(cachedIo);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return loadingPromise;
}

export async function connectSocket({ screenToken } = {}) {
  const io = await loadIo();
  const opts = {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  };
  if (screenToken) opts.auth = { screenToken };
  const socket = io(API_BASE, opts);
  return socket;
}
