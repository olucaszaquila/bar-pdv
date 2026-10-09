import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatarBRL, type CategoriaComProdutos, type Destino } from '@bar/shared';
import { api } from '../api';

export default function Cardapio() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['cardapio', 'todos'], queryFn: () => api<CategoriaComProdutos[]>('/cardapio?todos=1') });
  const [catNome, setCatNome] = useState('');
  const [p, setP] = useState({ nome: '', preco: '', categoriaId: '', destino: 'COZINHA' as Destino });
  const done = () => qc.invalidateQueries();
  const onError = (e: Error) => alert(e.message);

  const novaCat = useMutation({ mutationFn: () => api('/cardapio/categorias', { method: 'POST', body: { nome: catNome, ordem: data.length + 1 } }), onSuccess: () => { setCatNome(''); done(); }, onError });
  const novoProd = useMutation({
    mutationFn: () => api('/cardapio/produtos', {
      method: 'POST',
      body: { nome: p.nome, categoriaId: p.categoriaId || data[0]?.id, destino: p.destino, precoCentavos: Math.round(parseFloat(p.preco.replace(',', '.')) * 100) },
    }),
    onSuccess: () => { setP({ ...p, nome: '', preco: '' }); done(); },
    onError,
  });
  const alternar = useMutation({ mutationFn: (v: { id: string; ativo: boolean }) => api(`/cardapio/produtos/${v.id}`, { method: 'PATCH', body: { ativo: v.ativo } }), onSuccess: done, onError });

  const enviar = (fn: () => void) => (e: FormEvent) => { e.preventDefault(); fn(); };

  return (
    <>
      <h1>Cardápio</h1>
      <div className="forms">
        <form onSubmit={enviar(() => novaCat.mutate())}>
          <input placeholder="Nova categoria" value={catNome} onChange={(e) => setCatNome(e.target.value)} required />
          <button>Adicionar categoria</button>
        </form>
        <form onSubmit={enviar(() => novoProd.mutate())}>
          <input placeholder="Produto" value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} required />
          <input placeholder="Preço (ex: 12,50)" value={p.preco} onChange={(e) => setP({ ...p, preco: e.target.value })} required />
          <select value={p.categoriaId} onChange={(e) => setP({ ...p, categoriaId: e.target.value })}>
            {data.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={p.destino} onChange={(e) => setP({ ...p, destino: e.target.value as Destino })}>
            <option value="COZINHA">Cozinha</option>
            <option value="BAR">Bar</option>
          </select>
          <button>Adicionar produto</button>
        </form>
      </div>
      {data.map((c) => (
        <section key={c.id} className="cat">
          <h2>{c.nome}</h2>
          {c.produtos.map((pr) => (
            <div key={pr.id} className={`produto ${pr.ativo ? '' : 'inativo'}`}>
              <span>{pr.nome}<small>{pr.destino.toLowerCase()}</small></span>
              <span>{formatarBRL(pr.precoCentavos)}</span>
              <button className="ghost" onClick={() => alternar.mutate({ id: pr.id, ativo: !pr.ativo })}>{pr.ativo ? 'Desativar' : 'Reativar'}</button>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
