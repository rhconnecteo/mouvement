import { useState } from 'react';

const USERS = [
  { username: 'admin', password: 'admin123', displayName: 'Administrateur' },
  { username: 'user', password: 'user123', displayName: 'Utilisateur' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    // Petit délai simulé pour un retour visuel plus naturel
    setTimeout(() => {
      const found = USERS.find(u => u.username === username && u.password === password);
      setLoading(false);

      if (!found) {
        setError('Identifiants incorrects');
        return;
      }

      const user = { username: found.username, displayName: found.displayName };
      onLogin && onLogin(user);
    }, 400);
  }

  return (
    <div className="login-root">
      <style>{`
        .login-root{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:
            radial-gradient(circle at 15% 20%, rgba(255,255,255,0.18), transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(255,255,255,0.12), transparent 40%),
            linear-gradient(160deg, #0ABAB5 0%, #0A8F9C 55%, #06616F 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .login-card{
          width:400px;
          max-width:100%;
          height: 400px;
          background:rgba(255,255,255,0.94);
          backdrop-filter: blur(10px);
          border-radius:6px;
          padding:34px 32px;
          color:#0f2e2c;
          box-shadow:0 20px 50px rgba(4,40,45,0.35), 0 2px 6px rgba(4,40,45,0.12);
          border:1px solid rgba(255,255,255,0.6);
        }
        .login-brand{display:flex;align-items:center;gap:14px;margin-bottom:24px}
        .brand-logo{
          width:52px;height:52px;border-radius:4px;
          background:linear-gradient(135deg,#0ABAB5,#06616F);
          display:flex;align-items:center;justify-content:center;
          font-weight:800;color:#fff;font-size:17px;
          box-shadow:0 6px 16px rgba(10,186,181,0.35);
        }
        .brand-title{font-size:19px;font-weight:700;margin:0;color:#0f2e2c;border-bottom:none;padding-bottom:0}
        .brand-sub{font-size:13px;color:#5b7d7b;margin:2px 0 0}
        .form-row{margin-bottom:16px}
        .form-label{display:block;font-size:13px;font-weight:600;color:#2a4b49;margin-bottom:6px}
        .text-input{
          width:100%;padding:11px 13px;border-radius:4px;
          border:1.5px solid #dde8e7;background:#f7fbfb;color:#0f2e2c;
          outline:none;font-size:14px;transition:border-color .15s, box-shadow .15s;
          box-sizing:border-box;
        }
        .text-input::placeholder{color:#9fb3b1}
        .text-input:focus{
          border-color:#0ABAB5;
          box-shadow:0 0 0 4px rgba(10,186,181,0.15);
          background:#fff;
        }
        .actions{display:flex;align-items:center;justify-content:flex-end;margin-top:20px}
        .btn-primary{
          width:100%;
          background:linear-gradient(90deg,#0ABAB5,#06616F);
          color:#fff;padding:12px 14px;border-radius:4px;border:none;
          cursor:pointer;font-weight:700;font-size:14px;
          transition:transform .1s, box-shadow .15s, opacity .15s;
          box-shadow:0 8px 20px rgba(10,186,181,0.3);
        }
        .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(10,186,181,0.4)}
        .btn-primary:active:not(:disabled){transform:translateY(0)}
        .btn-primary:disabled{opacity:0.7;cursor:not-allowed}
        .hint{font-size:12px;color:#6d908e}
        .error-msg{
          background:#fdecec;color:#b3261e;border:1px solid #f6c9c6;
          padding:9px 11px;border-radius:4px;margin-top:12px;font-size:13px;
          display:flex;align-items:center;gap:6px;
        }
        .helpers{display:flex;align-items:center;gap:10px;margin-top:14px}
        .toggle-pass{
          position:absolute;right:6px;top:50%;transform:translateY(-50%);
          border:none;background:transparent;color:#0A8F9C;cursor:pointer;
          font-size:12px;font-weight:600;padding:6px 8px;border-radius:4px;
        }
        .toggle-pass:hover{background:rgba(10,186,181,0.1)}
      `}</style>

      <div className="login-card" role="dialog" aria-label="Formulaire de connexion">
        <div className="login-brand">
          <div className="brand-logo">MV</div>
          <div>
            <h3 className="brand-title">Mouvement RH</h3>
            <p className="brand-sub">Accédez à la gestion des départs et mouvements</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label" htmlFor="username">Utilisateur</label>
            <input
              id="username"
              autoFocus
              className="text-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="votre identifiant"
              autoComplete="username"
            />
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="password">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="text-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 68 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="helpers">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span className="hint">Se souvenir de moi</span>
            </label>
            <div style={{ marginLeft: 'auto' }} className="hint">Ex: admin / admin123</div>
          </div>

          {error ? <div className="error-msg">{error}</div> : null}

          <div className="actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}