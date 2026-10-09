import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { useRealtime } from './realtime';
import Login from './pages/Login';
import Mesas from './pages/Mesas';
import Comanda from './pages/Comanda';
import Fila from './pages/Fila';
import Cardapio from './pages/Cardapio';

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  useRealtime();
  const p = user!.papel;
  return (
    <div className="app">
      <header>
        <strong className="brand">Bar PDV</strong>
        <nav>
          {p !== 'COZINHA' && <NavLink to="/">Mesas</NavLink>}
          <NavLink to="/fila">Cozinha e bar</NavLink>
          {p === 'ADMIN' && <NavLink to="/cardapio">Cardápio</NavLink>}
        </nav>
        <span className="user">
          {user!.nome} ({p.toLowerCase()})
          <button className="ghost" onClick={logout}>Sair</button>
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Protegido({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={<Protegido>{user?.papel === 'COZINHA' ? <Navigate to="/fila" replace /> : <Mesas />}</Protegido>}
      />
      <Route path="/comandas/:id" element={<Protegido><Comanda /></Protegido>} />
      <Route path="/fila" element={<Protegido><Fila /></Protegido>} />
      <Route path="/cardapio" element={<Protegido><Cardapio /></Protegido>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
