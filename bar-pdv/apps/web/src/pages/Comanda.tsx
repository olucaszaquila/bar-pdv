import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FORMAS_PAGAMENTO,
  calcularTotais,
  formatarBRL,
  type CategoriaComProdutos,
  type ComandaDetalhe,
  type FormaPagamento,
} from '@bar/shared';
import { api } from '../api';
import { useAuth } from '../auth';

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Novo',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export default function Comanda() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [taxa, setTaxa] = useState<number | null>(null);
  const [forma, setForma] = useState<FormaPagamento>('PIX');

  const { data: c } = useQuery({ queryKey: ['comanda', id], queryFn: () => api<ComandaDetalhe>(`/comandas/${id}`) });
  const { data: cardapio = [] } = useQuery({ queryKey: ['cardapio'], queryFn: () => api<CategoriaComProdutos[]>('/cardapio') });

  const onError = (e: Error) => alert(e.message);
  const refresh = () => qc.invalidateQueries();

  const lancar = useMutation({
    mutationFn: () =>
      api(`/comandas/${id}/itens`, {
        method: 'POST',
        body: { itens: Object.entries(cart).filter(([, q]) => q > 0).map(([produtoId, quantidade]) => ({ produtoId, quantidade })) },
      }),
    onSuccess: () => { setCart({}); refresh(); },
    onError,
  });
  const entregar = useMutation({
    mutationFn: (itemId: string) => api(`/itens/${itemId}/status`, { method: 'PATCH', body: { status: 'ENTREGUE' } }),
    onSuccess: refresh, onError,
  });
  const cancelar = useMutation({
    mutationFn: (v: { itemId: string; motivo: string }) => api(`/itens/${v.itemId}/cancelar`, { method: 'POST', body: { motivo: v.motivo } }),
    onSuccess: refresh, onError,
  });
  const fechar = useMutation({
    mutationFn: (v: { taxa: number; total: number }) =>
      api<{ troco: number }>(`/comandas/${id}/fechar`, {
        method: 'POST',
        body: { taxaServicoPct: v.taxa, pagamentos: [{ forma, valorCentavos: v.total }] },
      }),
    onSuccess: () => { refresh(); nav('/'); },
    onError,
  });

  if (!c) return <p>Carregando…</p>;

  const aberta = c.status === 'ABERTA';
  const taxaAtual = taxa ?? c.taxaServicoPct;
  const totais = calcularTotais(c.itens, taxaAtual);
  const qtdCarrinho = Object.values(cart).reduce((s, q) => s + q, 0);
  const podeLancar = user!.papel === 'GARCOM' || user!.papel === 'CAIXA' || user!.papel === 'ADMIN';
  const podeFechar = user!.papel === 'CAIXA' || user!.papel === 'ADMIN';
  const mudar = (pid: string, d: number) => setCart((s) => ({ ...s, [pid]: Math.max(0, (s[pid] ?? 0) + d) }));

  return (
    <div className="comanda">
      <section>
        <h1>Mesa {c.mesa.numero} {c.nomeCliente && <small>· {c.nomeCliente}</small>}</h1>
        <p className="muted">Aberta por {c.garcom.nome}{!aberta && ' · conta fechada'}</p>

        <ul className="itens">
          {c.itens.map((i) => (
            <li key={i.id} className={i.status === 'CANCELADO' ? 'cancelado' : ''}>
              <span className="qtd">{i.quantidade}×</span>
              <span className="nome">{i.nomeProduto}{i.observacao && <em> ({i.observacao})</em>}</span>
              <span className={`badge ${i.status.toLowerCase()}`}>{STATUS_LABEL[i.status]}</span>
              <span className="preco">{formatarBRL(i.quantidade * i.precoCentavos)}</span>
              {aberta && i.status === 'PRONTO' && <button onClick={() => entregar.mutate(i.id)}>Entregue</button>}
              {aberta && i.status !== 'CANCELADO' && podeLancar && (
                <button className="ghost" onClick={() => { const motivo = prompt('Motivo do cancelamento?'); if (motivo) cancelar.mutate({ itemId: i.id, motivo }); }}>
                  Cancelar
                </button>
              )}
            </li>
          ))}
          {!c.itens.length && <li className="muted">Nenhum item ainda. Escolha no cardápio ao lado.</li>}
        </ul>

        <div className="totais">
          <div><span>Subtotal</span><span>{formatarBRL(totais.subtotal)}</span></div>
          <div>
            <span>Serviço <input className="mini" type="number" min={0} max={30} value={taxaAtual} disabled={!aberta || !podeFechar} onChange={(e) => setTaxa(Number(e.target.value))} />%</span>
            <span>{formatarBRL(totais.taxa)}</span>
          </div>
          <div className="total"><span>Total</span><span>{formatarBRL(totais.total)}</span></div>
        </div>

        {aberta && podeFechar && (
          <div className="fechar">
            <select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f.replace('_', ' ').toLowerCase()}</option>)}
            </select>
            <button className="primary" disabled={!totais.total || fechar.isPending} onClick={() => fechar.mutate({ taxa: taxaAtual, total: totais.total })}>
              Fechar conta
            </button>
          </div>
        )}
      </section>

      {aberta && podeLancar && (
        <aside>
          <h2>Cardápio</h2>
          {cardapio.map((cat) => (
            <div key={cat.id}>
              <h3>{cat.nome}</h3>
              {cat.produtos.map((p) => (
                <div key={p.id} className="produto">
                  <span>{p.nome}<small>{formatarBRL(p.precoCentavos)}</small></span>
                  <span className="stepper">
                    <button onClick={() => mudar(p.id, -1)}>−</button>
                    <b>{cart[p.id] ?? 0}</b>
                    <button onClick={() => mudar(p.id, 1)}>+</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
          <button className="primary block" disabled={!qtdCarrinho || lancar.isPending} onClick={() => lancar.mutate()}>
            Enviar pedido ({qtdCarrinho})
          </button>
        </aside>
      )}
    </div>
  );
}
