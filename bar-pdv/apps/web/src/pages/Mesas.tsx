import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatarBRL, type MesaResumo } from '@bar/shared';
import { api } from '../api';

export default function Mesas() {
  const nav = useNavigate();
  const { data = [] } = useQuery({ queryKey: ['mesas'], queryFn: () => api<MesaResumo[]>('/mesas') });
  const abrir = useMutation({
    mutationFn: (mesaId: string) => api<{ id: string }>('/comandas', { method: 'POST', body: { mesaId } }),
    onSuccess: (c) => nav(`/comandas/${c.id}`),
    onError: (e: Error) => alert(e.message),
  });

  return (
    <>
      <h1>Mesas</h1>
      <div className="grid">
        {data.map((m) => (
          <button
            key={m.id}
            className={`mesa ${m.comanda ? 'ocupada' : 'livre'}`}
            onClick={() => (m.comanda ? nav(`/comandas/${m.comanda.id}`) : abrir.mutate(m.id))}
          >
            <span className="num">{m.numero}</span>
            {m.comanda ? (
              <>
                <small>{m.comanda.nomeCliente ?? 'Ocupada'}</small>
                <b>{formatarBRL(m.comanda.total)}</b>
              </>
            ) : (
              <small>Livre</small>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
