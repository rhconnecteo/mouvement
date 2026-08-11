import { useState } from 'react';

const USERS = [
  { username: 'HRBP_CONNECTEO', password: 'offboarding', displayName: 'Administrateur' },
  { username: 'user', password: 'user123', displayName: 'Utilisateur' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500;600&display=swap');

        .login-root {
          all: unset;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 100vh !important;
          min-height: 100dvh !important;
          width: 100% !important;
          padding: 24px 20px !important;
          box-sizing: border-box !important;
          background: linear-gradient(160deg, #0ABAB5 0%, #08a29d 45%, #06616F 100%) !important;
          font-family: 'Jost', -apple-system, sans-serif !important;
          overflow: auto !important;
        }

        .login-root .login-frame,
        .login-root .login-card,
        .login-root .login-card * {
          box-sizing: border-box !important;
        }

        .login-root .login-frame {
          width: min(340px, 100%) !important;
          max-height: 460px !important;
          position: relative !important;
          padding: 12px !important;
          margin: auto !important;
        }

        .login-root .login-frame::before,
        .login-root .login-frame::after {
          content: '' !important;
          position: absolute !important;
          width: 18px !important;
          height: 18px !important;
          border-color: #F3D9CE !important;
        }
        .login-root .login-frame::before { top: 0 !important; left: 0 !important; border-top: 2px solid !important; border-left: 2px solid !important; }
        .login-root .login-frame::after { bottom: 0 !important; right: 0 !important; border-bottom: 2px solid !important; border-right: 2px solid !important; }

        .login-root .login-card {
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          background: #FFFFFF !important;
          border: 1px solid rgba(6,97,111,0.14) !important;
          border-radius: 14px !important;
          box-shadow: 0 20px 40px rgba(4,40,45,0.28) !important;
          position: relative !important;
          overflow: hidden !important;
          isolation: isolate !important;
          font-family: 'Jost', -apple-system, sans-serif !important;
          color: #0B3D3B !important;
          letter-spacing: 0.2px !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .login-root .login-card form {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          max-width: none !important;
          width: 100% !important;
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          min-height: auto !important;
          border: none !important;
        }

        .login-root .login-card h3,
        .login-root .login-card h2,
        .login-root .login-card p {
          color: inherit !important;
          margin: 0 !important;
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }

        .login-root .login-card input,
        .login-root .login-card button,
        .login-root .login-card label {
          font: inherit !important;
        }

        .login-root .ribbon {
          position: relative !important;
          height: 7px !important;
          background: linear-gradient(90deg, #0ABAB5, #06616F) !important;
        }

        .login-root .bow {
          position: absolute !important;
          top: 0 !important;
          left: 50% !important;
          transform: translate(-50%, -1px) !important;
          width: 38px !important;
          height: 20px !important;
          z-index: 2 !important;
        }

        .login-root .login-body {
          position: relative !important;
          padding: 26px 26px 22px !important;
        }

        .login-root .login-brand { text-align: center !important; margin-bottom: 18px !important; }
        .login-root .brand-mark {
          width: 34px !important;
          height: 34px !important;
          margin: 0 auto 10px !important;
          background: #0ABAB5 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: 'Cormorant Garamond', serif !important;
          font-weight: 600 !important;
          color: #fff !important;
          font-size: 15px !important;
        }
        .login-root .brand-title {
          font-family: 'Cormorant Garamond', serif !important;
          font-size: 22px !important;
          font-weight: 600 !important;
          margin: 0 0 4px !important;
          color: #0B3D3B !important;
          letter-spacing: 0.3px !important;
          border: none !important;
          text-decoration: none !important;
          padding: 0 !important;
        }
        .login-root .brand-sub {
          font-size: 11px !important;
          color: #7C9997 !important;
          margin: 0 !important;
          letter-spacing: 0.6px !important;
          text-transform: uppercase !important;
        }

        .login-root .form-row { margin-bottom: 12px !important; }
        .login-root .form-label {
          display: block !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #0B3D3B !important;
          margin-bottom: 6px !important;
          letter-spacing: 0.8px !important;
          text-transform: uppercase !important;
        }
        .login-root .text-input {
          width: 100% !important;
          padding: 10px 12px !important;
          border: none !important;
          border-bottom: 1.5px solid #DCE9E8 !important;
          border-radius: 0 !important;
          background: #F5FAFA !important;
          color: #0B3D3B !important;
          outline: none !important;
          font-size: 13.5px !important;
          font-family: 'Jost', sans-serif !important;
          transition: border-color .15s, background .15s !important;
          appearance: none !important;
          -webkit-appearance: none !important;
        }
        .login-root .text-input::placeholder { color: #A9BFBD !important; }
        .login-root .text-input:focus {
          border-color: #0ABAB5 !important;
          background: #EFFAF9 !important;
        }

        .login-root .pw-wrap { position: relative !important; }
        .login-root .toggle-pass {
          position: absolute !important;
          right: 0 !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          border: none !important;
          border-left: 1.5px solid #DCE9E8 !important;
          background: transparent !important;
          border-radius: 0 !important;
          color: #0A8F9C !important;
          cursor: pointer !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          padding: 10px 10px !important;
        }
        .login-root .toggle-pass:hover { background: #EFFAF9 !important; }

        .login-root .error-msg {
          background: #FBEAF0 !important;
          color: #993556 !important;
          border-left: 3px solid #D4537E !important;
          border-radius: 0 !important;
          padding: 9px 11px !important;
          margin-top: 2px !important;
          margin-bottom: 12px !important;
          font-size: 12px !important;
        }

        .login-root .btn-primary {
          width: 100% !important;
          background: #0B3D3B !important;
          border-radius: 0 !important;
          color: #fff !important;
          padding: 12px !important;
          border: none !important;
          cursor: pointer !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          letter-spacing: 1.5px !important;
          text-transform: uppercase !important;
          font-family: 'Jost', sans-serif !important;
          transition: background .15s, opacity .15s !important;
        }
        .login-root .btn-primary:hover:not(:disabled) { background: #06616F !important; }
        .login-root .btn-primary:disabled { opacity: 0.65 !important; cursor: not-allowed !important; }

        .login-root .login-footer {
          text-align: center !important;
          margin-top: 14px !important;
          font-size: 10.5px !important;
          color: #9FB3B1 !important;
          letter-spacing: 0.4px !important;
        }

        @media (max-width: 480px) {
          .login-root {
            padding: 14px 12px !important;
          }

          .login-root .login-frame {
            width: 100% !important;
            padding: 8px !important;
          }

          .login-root .login-body {
            padding: 20px 16px 18px !important;
          }

          .login-root .brand-title {
            font-size: 20px !important;
          }

          .login-root .brand-sub {
            font-size: 10px !important;
          }
        }
      `}</style>

      <div className="login-frame">
        <div className="login-card" role="dialog" aria-label="Formulaire de connexion">
          <div className="ribbon" />
          <svg className="bow" viewBox="0 0 46 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M23 14 C23 14 10 2 4 6 C-2 10 8 20 23 14 Z" fill="#F3D9CE" />
            <path d="M23 14 C23 14 36 2 42 6 C48 10 38 20 23 14 Z" fill="#F3D9CE" />
            <circle cx="23" cy="13" r="4.5" fill="#0B3D3B" />
          </svg>

          <div className="login-body">
            <div className="login-brand">
              <div className="brand-mark">MV</div>
              <h3 className="brand-title">Mouvement RH</h3>
              <p className="brand-sub">Départs & mouvements</p>
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
                <div className="pw-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="text-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: 84 }}
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

              {error ? <div className="error-msg">{error}</div> : null}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <p className="login-footer">Espace réservé au personnel autorisé</p>
          </div>
        </div>
      </div>
    </div>
  );
}