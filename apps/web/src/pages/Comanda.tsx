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

type LinhaPagamento = { forma: FormaPagamento; valorCentavos: number };

export default function Comanda() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [taxa, setTaxa] = useState<number | null>(null);
  const [pagamentos, setPagamentos] = useState<LinhaPagamento[] | null>(null);
  const [dinheiroRecebido, setDinheiroRecebido] = useState<number | null>(null);

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
    mutationFn: (v: { taxa: number; pagamentos: LinhaPagamento[]; dinheiroRecebidoCentavos: number }) =>
      api<{ troco: number }>(`/comandas/${id}/fechar`, {
        method: 'POST',
        body: {
          taxaServicoPct: v.taxa,
          pagamentos: v.pagamentos,
          dinheiroRecebidoCentavos: v.dinheiroRecebidoCentavos,
        },
      }),
    onSuccess: ({ troco }) => {
      if (troco > 0) window.alert(`Conta fechada. Troco: ${formatarBRL(troco)}`);
      refresh();
      nav('/');
    },
    onError,
  });

  if (!c) return <p>Carregando…</p>;

  const aberta = c.status === 'ABERTA';
  const taxaAtual = taxa ?? c.taxaServicoPct;
  const totais = calcularTotais(c.itens, taxaAtual);
  const linhasPagamento = pagamentos ?? [{ forma: 'PIX' as FormaPagamento, valorCentavos: totais.total }];
  const valorAlocado = linhasPagamento.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0);
  const dinheiroAlocado = linhasPagamento
    .filter((pagamento) => pagamento.forma === 'DINHEIRO')
    .reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0);
  const dinheiroRecebidoAtual = dinheiroRecebido ?? dinheiroAlocado;
  const trocoPrevisto = Math.max(0, dinheiroRecebidoAtual - dinheiroAlocado);
  const qtdCarrinho = Object.values(cart).reduce((s, q) => s + q, 0);
  const podeLancar = user!.papel === 'GARCOM' || user!.papel === 'CAIXA' || user!.papel === 'ADMIN';
  const podeFechar = user!.papel === 'CAIXA' || user!.papel === 'ADMIN';
  const mudar = (pid: string, d: number) => setCart((s) => ({ ...s, [pid]: Math.max(0, (s[pid] ?? 0) + d) }));
  const atualizarPagamento = (index: number, patch: Partial<LinhaPagamento>) => {
    setPagamentos(linhasPagamento.map((pagamento, i) => i === index ? { ...pagamento, ...patch } : pagamento));
  };

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

        {!aberta && c.pagamentos.length > 0 && (
          <div className="pagamentos-registrados">
            <h2>Pagamentos</h2>
            {c.pagamentos.map((pagamento) => (
              <div key={pagamento.id}>
                <span>{pagamento.forma.replace(/_/g, ' ').toLowerCase()}</span>
                <span>{formatarBRL(pagamento.valorCentavos)}</span>
              </div>
            ))}
          </div>
        )}

        {aberta && podeFechar && (
          <div className="fechar">
            <h2>Pagamento</h2>
            {linhasPagamento.map((pagamento, index) => (
              <div className="linha-pagamento" key={index}>
                <label>
                  Forma
                  <select value={pagamento.forma} onChange={(e) => atualizarPagamento(index, { forma: e.target.value as FormaPagamento })}>
                    {FORMAS_PAGAMENTO.map((formaPagamento) => (
                      <option key={formaPagamento} value={formaPagamento}>{formaPagamento.replace(/_/g, ' ').toLowerCase()}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Valor na conta
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={(pagamento.valorCentavos / 100).toFixed(2)}
                    onChange={(e) => atualizarPagamento(index, { valorCentavos: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                  />
                </label>
                {linhasPagamento.length > 1 && (
                  <button className="ghost" aria-label="Remover forma de pagamento" onClick={() => setPagamentos(linhasPagamento.filter((_, i) => i !== index))}>
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setPagamentos([...linhasPagamento, { forma: 'DINHEIRO', valorCentavos: 0 }])}>
              + Adicionar forma
            </button>
            <div className="resumo-pagamento">
              <span>Alocado: {formatarBRL(valorAlocado)}</span>
              <span>{valorAlocado === totais.total ? 'Total completo' : `${valorAlocado < totais.total ? 'Falta' : 'Excede'} ${formatarBRL(Math.abs(totais.total - valorAlocado))}`}</span>
            </div>
            {dinheiroAlocado > 0 && (
              <label className="dinheiro-recebido">
                Dinheiro recebido
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(dinheiroRecebidoAtual / 100).toFixed(2)}
                  onChange={(e) => setDinheiroRecebido(Math.max(0, Math.round(Number(e.target.value) * 100)))}
                />
                {dinheiroRecebidoAtual >= dinheiroAlocado
                  ? <small>Troco: {formatarBRL(trocoPrevisto)}</small>
                  : <small className="erro">Valor recebido menor que a parcela em dinheiro</small>}
              </label>
            )}
            <button
              className="primary"
              disabled={
                !totais.total || linhasPagamento.some((pagamento) => pagamento.valorCentavos <= 0) ||
                valorAlocado !== totais.total ||
                dinheiroRecebidoAtual < dinheiroAlocado || fechar.isPending
              }
              onClick={() => fechar.mutate({
                taxa: taxaAtual,
                pagamentos: linhasPagamento,
                dinheiroRecebidoCentavos: dinheiroAlocado > 0 ? dinheiroRecebidoAtual : 0,
              })}
            >
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
