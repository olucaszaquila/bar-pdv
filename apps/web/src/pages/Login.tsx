import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@demo.com');
  const [senha, setSenha] = useState('123456');
  const [erro, setErro] = useState('');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      await login(email, senha);
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <form className="login" onSubmit={enviar}>
      <h1>Bar PDV</h1>
      <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
      <label>Senha<input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" required /></label>
      {erro && <p className="erro">{erro}</p>}
      <button className="primary">Entrar</button>
    </form>
  );
}
