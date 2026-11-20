import { errorMessage } from '../api/errors.js';
import { useId, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import Icon from '../../components/Icons.jsx';
import { HERO_ART, hideOnError } from '../art.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

/* Entrar / Criar conta: painel de couro com filete dourado (o mesmo da tela inicial e
 * da ficha), arte no topo, as três vantagens da conta e o formulário. A troca de modo é
 * um seletor de dois botões (alcançável pelo teclado) e limpa o erro anterior; a
 * validação é do app (mensagens no idioma da tela, não o balão nativo do navegador). */
export default function AuthScreen({ onSkip, lang = 'pt' }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [badLogin, setBadLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const uid = useId();
  const emailRef = useRef(null);
  const passRef = useRef(null);

  const t = (pt, en) => lang === 'pt' ? pt : en;
  const signupMode = mode === 'signup';

  // Trocar de modo nunca leva o erro (nem a senha digitada) do outro formulário.
  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setForgot(false);
    setBadLogin(false);
    setError('');
    setFieldErr({});
    if (next === 'signup') setPassword('');
  };

  const validate = () => {
    const errs = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = t('Digite um e-mail válido, como nome@exemplo.com.', 'Enter a valid email, like name@example.com.');
    if (!password) errs.password = t('Digite sua senha.', 'Enter your password.');
    else if (signupMode && password.length < MIN_PASSWORD) errs.password = t(`A senha precisa de ${MIN_PASSWORD} caracteres ou mais.`, `The password needs ${MIN_PASSWORD} or more characters.`);
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBadLogin(false);
    const errs = validate();
    setFieldErr(errs);
    if (errs.email) { emailRef.current?.focus(); return; }
    if (errs.password) { passRef.current?.focus(); return; }
    setBusy(true);
    try {
      const mail = email.trim();
      if (signupMode) await signup(mail, password, displayName.trim() || mail.split('@')[0]);
      else await login(mail, password);
    } catch (err) {
      const code = err?.data?.error;
      if (code === 'email_taken') setError(t('Este e-mail já tem conta. Use "Entrar".', 'This email already has an account. Use "Log in".'));
      else if (code === 'invalid_credentials') { setError(t('E-mail ou senha incorretos.', 'Wrong email or password.')); setBadLogin(true); setForgot(false); }
      else if (code === 'invalid_input') setError(t(`Dados inválidos. A senha precisa de ${MIN_PASSWORD} caracteres ou mais.`, `Invalid input. The password needs ${MIN_PASSWORD} or more characters.`));
      else setError(errorMessage(err, lang, t('Não foi possível entrar. Tente de novo.', 'Could not sign in. Try again.')));
    } finally {
      setBusy(false);
    }
  };

  // Não há "esqueci a senha" por e-mail: quem administra a Forja emite uma senha temporária
  // e o próximo acesso obriga a trocar (ForcePasswordChange). O jogador precisa saber disso.
  const forgotHelp = t('Peça uma senha temporária a quem administra a Forja. No próximo acesso você escolhe uma nova.',
    'Ask the Forge admin for a temporary password. You will choose a new one at the next login.');

  const perks = [
    t('Suas fichas guardadas na nuvem, em qualquer aparelho', 'Your characters kept in the cloud, on any device'),
    t('Entre em mesas com o código do mestre', "Join tables with your DM's code"),
    t('Crie campanhas e use a Tela do mestre', 'Run campaigns and use the DM screen'),
  ];

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-art" aria-hidden="true">
          <img src={HERO_ART} alt="" decoding="async" onError={hideOnError} />
          <span className="auth-art-mark"><Icon name="logo" size={34} /></span>
        </div>
        <div className="auth-body">
          <p className="auth-eyebrow">{t('Forja de Heróis', 'Hero Forge')}</p>
          <h1 className="auth-title"><span className="auth-foil">{signupMode ? t('Criar conta', 'Create account') : t('Entrar', 'Log in')}</span></h1>
          <ul className="auth-perks no-zebra">
            {perks.map(p => <li key={p}><span className="auth-gem" aria-hidden="true" />{p}</li>)}
          </ul>

          <div className="auth-seg" role="group" aria-label={t('Já tem conta ou é a primeira vez?', 'Have an account or first time here?')}>
            <button type="button" aria-pressed={!signupMode} onClick={() => switchMode('login')}>{t('Já tenho conta', 'I have an account')}</button>
            <button type="button" aria-pressed={signupMode} onClick={() => switchMode('signup')}>{t('Criar conta', 'Create account')}</button>
          </div>

          <form onSubmit={submit} className="auth-form" noValidate>
            {error && (
              <div className="auth-error" role="alert">
                <Icon name="warning" size={18} aria-hidden="true" />
                <span>{error}{badLogin && !signupMode && <span className="auth-error-help">{forgotHelp}</span>}</span>
              </div>
            )}
            {signupMode && (
              <div className="auth-field">
                <label htmlFor={`${uid}-name`}>{t('Nome de exibição', 'Display name')} <span className="auth-opt">{t('opcional', 'optional')}</span></label>
                <input id={`${uid}-name`} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input"
                  placeholder={t('Como você quer ser chamado', 'How you want to be called')} autoComplete="nickname" maxLength={60} />
              </div>
            )}
            <div className="auth-field">
              <label htmlFor={`${uid}-email`}>E-mail</label>
              <input id={`${uid}-email`} ref={emailRef} type="email" inputMode="email" value={email}
                onChange={e => { setEmail(e.target.value); if (fieldErr.email) setFieldErr(f => ({ ...f, email: '' })); }}
                className="input" required autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus
                aria-invalid={fieldErr.email ? true : undefined} aria-describedby={fieldErr.email ? `${uid}-email-err` : undefined} />
              {fieldErr.email && <p className="auth-field-err" id={`${uid}-email-err`}>{fieldErr.email}</p>}
            </div>
            <div className="auth-field">
              <label htmlFor={`${uid}-pass`}>{t('Senha', 'Password')}</label>
              <div className="auth-pass">
                <input id={`${uid}-pass`} ref={passRef} type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); if (fieldErr.password) setFieldErr(f => ({ ...f, password: '' })); }}
                  className="input" required minLength={MIN_PASSWORD} autoCapitalize="none" spellCheck={false}
                  autoComplete={signupMode ? 'new-password' : 'current-password'}
                  aria-invalid={fieldErr.password ? true : undefined}
                  aria-describedby={[fieldErr.password ? `${uid}-pass-err` : '', signupMode ? `${uid}-pass-hint` : ''].filter(Boolean).join(' ') || undefined} />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword}
                  aria-label={showPassword ? t('Esconder a senha', 'Hide password') : t('Mostrar a senha', 'Show password')}
                  title={showPassword ? t('Esconder a senha', 'Hide password') : t('Mostrar a senha', 'Show password')}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
                </button>
              </div>
              {fieldErr.password && <p className="auth-field-err" id={`${uid}-pass-err`}>{fieldErr.password}</p>}
              {signupMode && !fieldErr.password && <p className="auth-field-hint" id={`${uid}-pass-hint`}>{t(`${MIN_PASSWORD} caracteres ou mais.`, `${MIN_PASSWORD} or more characters.`)}</p>}
              {!signupMode && (
                <div className="auth-forgot">
                  <button type="button" className="auth-forgot-btn" aria-expanded={forgot} aria-controls={`${uid}-forgot`} onClick={() => setForgot(v => !v)}>
                    {t('Esqueceu a senha?', 'Forgot your password?')}
                  </button>
                  {forgot && <p className="auth-forgot-help" id={`${uid}-forgot`} role="status">{forgotHelp}</p>}
                </div>
              )}
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={busy} aria-busy={busy || undefined}>
              {busy ? t('Aguarde…', 'Please wait…') : (signupMode ? t('Criar minha conta', 'Create my account') : t('Entrar', 'Log in'))}
            </button>
          </form>

          {onSkip && (
            <div className="auth-skip">
              <button className="btn btn-ghost" type="button" onClick={onSkip}>
                {t('Continuar sem conta', 'Continue without account')}
              </button>
              <p className="auth-skip-note">{t('Sem conta, as fichas ficam salvas só neste navegador.', 'Without an account, characters are saved only in this browser.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
