import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Destino, ItemFila } from '@bar/shared';
import { api } from '../api';
import { useAuth } from '../auth';

type Proximo = 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE';
const COLUNAS: { status: string; titulo: string; proximo: Proximo; acao: string }[] = [
  { status: 'PENDENTE', titulo: 'Novos', proximo: 'EM_PREPARO', acao: 'Iniciar' },
  { status: 'EM_PREPARO', titulo: 'Em preparo', proximo: 'PRONTO', acao: 'Pronto' },
  { status: 'PRONTO', titulo: 'Prontos para entregar', proximo: 'ENTREGUE', acao: 'Entregue' },
];

const minutos = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

export default function Fila() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [destino, setDestino] = useState<'' | Destino>('');
  const { data = [] } = useQuery({
    queryKey: ['fila', destino],
    queryFn: () => api<ItemFila[]>(`/itens/fila${destino ? `?destino=${destino}` : ''}`),
    refetchInterval: 30000, // rede de segurança caso o WebSocket caia
  });
  const avancar = useMutation({
    mutationFn: (v: { id: string; status: Proximo }) => api(`/itens/${v.id}/status`, { method: 'PATCH', body: { status: v.status } }),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => alert(e.message),
  });

  const podeAgir = (p: Proximo) => (p === 'ENTREGUE' ? user!.papel !== 'COZINHA' : user!.papel === 'COZINHA' || user!.papel === 'ADMIN');

  return (
    <>
      <div className="linha">
        <h1>Cozinha e bar</h1>
        <select value={destino} onChange={(e) => setDestino(e.target.value as '' | Destino)}>
          <option value="">Tudo</option>
          <option value="COZINHA">Cozinha</option>
          <option value="BAR">Bar</option>
        </select>
      </div>
      <div className="kanban">
        {COLUNAS.map((col) => {
          const itens = data.filter((i) => i.status === col.status);
          return (
            <section key={col.status}>
              <h2>{col.titulo} <span className="count">{itens.length}</span></h2>
              {itens.map((i) => (
                <article key={i.id} className="ticket">
                  <header><b>Mesa {i.mesaNumero}</b><small>{minutos(i.criadoEm)} min · {i.destino.toLowerCase()}</small></header>
                  <p>{i.quantidade}× {i.nomeProduto}</p>
                  {i.observacao && <p className="obs">{i.observacao}</p>}
                  {podeAgir(col.proximo) && (
                    <button className="primary" onClick={() => avancar.mutate({ id: i.id, status: col.proximo })}>{col.acao}</button>
                  )}
                </article>
              ))}
              {!itens.length && <p className="muted">Nada aqui.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
