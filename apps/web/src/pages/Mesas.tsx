import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatarBRL, type MesaResumo } from '@bar/shared';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Mesas() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ['mesas'], queryFn: () => api<MesaResumo[]>('/mesas') });
  const anotar = useMutation({
    mutationFn: ({ mesaId, anotacao }: { mesaId: string; anotacao: string }) =>
      api<MesaResumo>(`/mesas/${mesaId}/anotacao`, { method: 'PATCH', body: { anotacao } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
    onError: (e: Error) => alert(e.message),
  });
  const adicionar = useMutation({
    mutationFn: () => api<MesaResumo>('/mesas', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
    onError: (e: Error) => alert(e.message),
  });
  const abrir = useMutation({
    mutationFn: (mesaId: string) => api<{ id: string }>('/comandas', { method: 'POST', body: { mesaId } }),
    onSuccess: (c) => nav(`/comandas/${c.id}`),
    onError: (e: Error) => alert(e.message),
  });

  return (
    <>
      <div className="linha">
        <h1>Mesas <small>({data.length})</small></h1>
        {user?.papel === 'ADMIN' && (
          <button className="primary" onClick={() => adicionar.mutate()} disabled={adicionar.isPending}>
            {adicionar.isPending ? 'Adicionando...' : 'Adicionar mesa'}
          </button>
        )}
      </div>
      <div className="grid">
        {data.map((m) => (
          <div key={m.id} className={`mesa ${m.comanda ? 'ocupada' : 'livre'}`}>
            <button
              className="mesa-abrir"
              onClick={() => (m.comanda ? nav(`/comandas/${m.comanda.id}`) : abrir.mutate(m.id))}
            >
              <span className="num">{m.numero}</span>
              {m.anotacao && <small className="anotacao">{m.anotacao}</small>}
              {m.comanda ? (
                <>
                  <small>{m.comanda.nomeCliente ?? 'Ocupada'}</small>
                  <b>{formatarBRL(m.comanda.total)}</b>
                </>
              ) : (
                <small>Livre</small>
              )}
            </button>
            {user?.papel === 'ADMIN' && (
              <button
                className="mesa-anotar"
                onClick={() => {
                  const anotacao = window.prompt('Anotação da mesa (até 60 caracteres)', m.anotacao ?? '');
                  if (anotacao !== null) anotar.mutate({ mesaId: m.id, anotacao });
                }}
                disabled={anotar.isPending}
              >
                {m.anotacao ? 'Editar anotação' : 'Anotar mesa'}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
