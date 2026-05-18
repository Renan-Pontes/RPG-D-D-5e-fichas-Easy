import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

export default function AuthScreen({ onSkip, lang = 'pt' }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const t = (pt, en) => lang === 'pt' ? pt : en;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signup(email, password, displayName || email.split('@')[0]);
      else await login(email, password);
    } catch (err) {
      const code = err?.data?.error;
      if (code === 'email_taken') setError(t('E-mail já cadastrado', 'Email already registered'));
      else if (code === 'invalid_credentials') setError(t('E-mail ou senha incorretos', 'Invalid credentials'));
      else if (code === 'invalid_input') setError(t('Dados inválidos. Senha precisa de 6+ caracteres.', 'Invalid input. Password must be 6+ chars.'));
      else setError(err?.message || t('Falha ao autenticar', 'Auth failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 style={{ marginTop: 0 }}>
          {mode === 'signup' ? t('Criar conta', 'Sign up') : t('Entrar', 'Log in')}
        </h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 0 }}>
          {t(
            'Salve seus personagens na nuvem, entre em campanhas e participe do telão do mestre.',
            'Save your characters in the cloud, join campaigns, and the DM screen.'
          )}
        </p>
        <form onSubmit={submit} className="col gap-3">
          {mode === 'signup' && (
            <label className="col gap-1">
              <span>{t('Nome de exibição', 'Display name')}</span>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input"
                placeholder={t('Como você quer ser chamado', 'How you want to be called')}
                autoComplete="nickname"
              />
            </label>
          )}
          <label className="col gap-1">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="email"
              autoFocus
            />
          </label>
          <label className="col gap-1">
            <span>{t('Senha', 'Password')}</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t('Aguarde…', 'Please wait…') : (mode === 'signup' ? t('Criar conta', 'Sign up') : t('Entrar', 'Log in'))}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'signup' ? (
            <>{t('Já tem conta?', 'Already have an account?')} <a onClick={() => setMode('login')}>{t('Entrar', 'Log in')}</a></>
          ) : (
            <>{t('Novo por aqui?', 'New here?')} <a onClick={() => setMode('signup')}>{t('Criar conta', 'Create account')}</a></>
          )}
        </div>
        {onSkip && (
          <div className="auth-skip">
            <button className="btn btn-ghost" type="button" onClick={onSkip}>
              {t('Continuar offline (salvar só neste navegador)', 'Continue offline (save in this browser only)')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
