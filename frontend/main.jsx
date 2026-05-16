import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './src/auth/auth-styles.css';
import './src/screen/tv-styles.css';
import './src/app-extra-styles.css';
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

// Router minimalista: a rota /tv/<token> abre o telão público sem auth.
function Root() {
  const path = window.location.pathname;
  const tvMatch = path.match(/^\/tv\/([^\/]+)$/);
  const lang = (localStorage.getItem('dnd5e-forge:lang') || (navigator.language || '').startsWith('pt') ? 'pt' : 'en');

  if (tvMatch) {
    return (
      <Suspense fallback={<Loading />}>
        <TVScreen token={tvMatch[1]} lang={lang} />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
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
