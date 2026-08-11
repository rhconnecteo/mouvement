import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './Login';
import '../style.css';

function Root() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mouvement_user')); } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem('mouvement_user', JSON.stringify(user));
    else localStorage.removeItem('mouvement_user');
  }, [user]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <App user={user} onLogout={() => setUser(null)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
