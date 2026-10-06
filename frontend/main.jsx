import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './src/auth/auth-styles.css';
import './src/screen/tv-styles.css';
import './src/app-extra-styles.css';
import './src/campaigns/combat-styles.css';
import './src/campaigns/dm-desktop.css';
import './src/mobile-styles.css';
import { AuthProvider } from './src/auth/AuthContext.jsx';

// Lazy: o TV screen é uma rota independente e o App é grande (SRD pesa).
// Separar reduz o bundle inicial e acelera o primeiro paint do TV.
const App = lazy(() => import('./app.jsx'));
const TVScreen = lazy(() => import('./src/screen/TVScreen.jsx'));

function Loading() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ink-secondary, #c0b090)',
      fontFamily: 'Cinzel, serif',
    }}>
      Carregando…
    </div>
  );
}

// Idioma salvo ('pt' | 'en') ou, sem nada salvo, o do navegador.
function initialLang() {
  let stored = null;
  try { stored = localStorage.getItem('dnd5e-forge:lang'); } catch { /* bloqueado */ }
  if (stored === 'pt' || stored === 'en') return stored;
  return (navigator.language || '').startsWith('pt') ? 'pt' : 'en';
}

// Router minimalista: a rota /tv/<token> abre o telão público sem auth.
function Root() {
  const path = window.location.pathname;
  const tvMatch = path.match(/^\/tv\/([^\/]+)$/);
  const lang = initialLang();

  if (tvMatch) {
    return (
      <Suspense fallback={<Loading />}>
        <TVScreen token={tvMatch[1]} lang={lang} />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <a href="#main" className="skip-link">{lang === 'pt' ? 'Pular para o conteúdo' : 'Skip to content'}</a>
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
