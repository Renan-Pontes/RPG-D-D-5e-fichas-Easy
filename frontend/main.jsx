import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './src/auth/auth-styles.css';
import './src/screen/tv-styles.css';
import './src/app-extra-styles.css';
import App from './app.jsx';
import { AuthProvider } from './src/auth/AuthContext.jsx';
import TVScreen from './src/screen/TVScreen.jsx';

// Router minimalista: a rota /tv/<token> abre o telão público sem auth.
function Root() {
  const path = window.location.pathname;
  const tvMatch = path.match(/^\/tv\/([^\/]+)$/);
  const lang = (localStorage.getItem('dnd5e-forge:lang') || (navigator.language || '').startsWith('pt') ? 'pt' : 'en');

  if (tvMatch) {
    return <TVScreen token={tvMatch[1]} lang={lang} />;
  }

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
