import { useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { useAuth } from './AuthContext.jsx';

/**
 * Senha temporária: o admin definiu uma senha provisória e o app só libera o
 * resto depois que a pessoa escolher a dela.
 */
export default function ForcePasswordChange({ lang = 'pt' }) {
  const { user, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const t = (pt, en) => (lang === 'pt' ? pt : en);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError(t('As duas senhas novas não são iguais.', 'The new passwords do not match.')); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
    } catch (err) {
      const code = err?.data?.error;
      if (code === 'wrong_password') setError(t('A senha temporária não confere.', 'The temporary password is wrong.'));
      else if (code === 'same_password') setError(t('Escolha uma senha diferente da temporária.', 'Pick a password different from the temporary one.'));
      else if (code === 'weak_password') setError(t('Senha fraca: use 6+ caracteres e evite senhas comuns.', 'Weak password: use 6+ characters and avoid common ones.'));
      else setError(errorMessage(err, lang, t('Não deu para trocar a senha.', 'Could not change the password.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 style={{ marginTop: 0 }}>{t('Crie sua nova senha', 'Create your new password')}</h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 0 }}>
          {t(
            `Olá, ${user?.displayName || ''}! Sua senha atual é temporária. Para continuar, escolha uma senha só sua.`,
            `Hi, ${user?.displayName || ''}! Your current password is temporary. To continue, pick your own.`
          )}
        </p>
        <form onSubmit={submit} className="col gap-3">
          <label className="col gap-1">
            <span>{t('Senha temporária', 'Temporary password')}</span>
            <input type="password" className="input" value={current} onChange={e => setCurrent(e.target.value)}
              required autoComplete="current-password" autoFocus />
          </label>
          <label className="col gap-1">
            <span>{t('Nova senha', 'New password')}</span>
            <input type="password" className="input" value={next} onChange={e => setNext(e.target.value)}
              required minLength={6} autoComplete="new-password" />
          </label>
          <label className="col gap-1">
            <span>{t('Repita a nova senha', 'Repeat the new password')}</span>
            <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)}
              required minLength={6} autoComplete="new-password" />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t('Aguarde…', 'Please wait…') : t('Salvar e continuar', 'Save and continue')}
          </button>
        </form>
        <div className="auth-switch">
          <a onClick={logout}>{t('Sair', 'Log out')}</a>
        </div>
      </div>
    </div>
  );
}
