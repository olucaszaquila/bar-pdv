import { z } from 'zod';

/* ---------- Enums (espelham o schema do Prisma) ---------- */
export const PAPEIS = ['ADMIN', 'GARCOM', 'COZINHA', 'CAIXA'] as const;
export type Papel = (typeof PAPEIS)[number];

export const DESTINOS = ['COZINHA', 'BAR'] as const;
export type Destino = (typeof DESTINOS)[number];

export const STATUS_ITEM = ['PENDENTE', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

/* ---------- Eventos de tempo real (Socket.IO) ---------- */
export const EVENTOS = { FILA: 'fila:atualizada', MESAS: 'mesas:atualizada' } as const;

/* ---------- Autenticação ---------- */
export interface JwtPayload {
  sub: string;
  nome: string;
  estabelecimentoId: string;
  papel: Papel;
}
export interface Usuario {
  id: string;
  nome: string;
  papel: Papel;
}

/* ---------- Schemas de entrada (validados no back, reutilizáveis nos forms) ---------- */
export const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });

export const categoriaSchema = z.object({ nome: z.string().min(1), ordem: z.number().int().optional() });

export const produtoSchema = z.object({
  nome: z.string().min(1),
  categoriaId: z.string().min(1),
  precoCentavos: z.number().int().positive(),
  destino: z.enum(DESTINOS),
  ativo: z.boolean().optional(),
});
export const produtoUpdateSchema = produtoSchema.partial();

export const abrirComandaSchema = z.object({
  mesaId: z.string().min(1),
  nomeCliente: z.string().max(60).optional(),
});

export const lancarItensSchema = z.object({
  itens: z
    .array(
      z.object({
        produtoId: z.string().min(1),
        quantidade: z.number().int().min(1).max(99),
        observacao: z.string().max(200).optional(),
      }),
    )
    .min(1),
});

export const statusItemSchema = z.object({ status: z.enum(['EM_PREPARO', 'PRONTO', 'ENTREGUE']) });
export const cancelarItemSchema = z.object({ motivo: z.string().min(3, 'Informe o motivo') });
export const transferirMesaSchema = z.object({ mesaId: z.string().min(1) });

export const fecharComandaSchema = z.object({
  taxaServicoPct: z.number().int().min(0).max(30).optional(),
  pagamentos: z
    .array(z.object({ forma: z.enum(FORMAS_PAGAMENTO), valorCentavos: z.number().int().positive() }))
    .min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type CategoriaDto = z.infer<typeof categoriaSchema>;
export type ProdutoDto = z.infer<typeof produtoSchema>;
export type ProdutoUpdateDto = z.infer<typeof produtoUpdateSchema>;
export type AbrirComandaDto = z.infer<typeof abrirComandaSchema>;
export type LancarItensDto = z.infer<typeof lancarItensSchema>;
export type StatusItemDto = z.infer<typeof statusItemSchema>;
export type CancelarItemDto = z.infer<typeof cancelarItemSchema>;
export type TransferirMesaDto = z.infer<typeof transferirMesaSchema>;
export type FecharComandaDto = z.infer<typeof fecharComandaSchema>;

/* ---------- Formatos de resposta da API ---------- */
export interface ProdutoResumo {
  id: string;
  nome: string;
  precoCentavos: number;
  destino: Destino;
  categoriaId: string;
  ativo: boolean;
}
export interface CategoriaComProdutos {
  id: string;
  nome: string;
  ordem: number;
  produtos: ProdutoResumo[];
}
export interface MesaResumo {
  id: string;
  numero: number;
  comanda: null | { id: string; nomeCliente: string | null; abertaEm: string; total: number };
}
export interface ItemResumo {
  id: string;
  nomeProduto: string;
  precoCentavos: number;
  quantidade: number;
  observacao: string | null;
  destino: Destino;
  status: StatusItem;
  criadoEm: string;
}
export interface ItemFila extends ItemResumo {
  comandaId: string;
  mesaNumero: number;
}
export interface Totais {
  subtotal: number;
  taxa: number;
  total: number;
}
export interface ComandaDetalhe {
  id: string;
  status: 'ABERTA' | 'FECHADA';
  nomeCliente: string | null;
  taxaServicoPct: number;
  mesa: { id: string; numero: number };
  garcom: { nome: string };
  itens: ItemResumo[];
  totais: Totais;
}

/* ---------- Regras de negócio compartilhadas ---------- */
export function calcularTotais(
  itens: { quantidade: number; precoCentavos: number; status: string }[],
  taxaServicoPct: number,
): Totais {
  const subtotal = itens
    .filter((i) => i.status !== 'CANCELADO')
    .reduce((soma, i) => soma + i.quantidade * i.precoCentavos, 0);
  const taxa = Math.round((subtotal * taxaServicoPct) / 100);
  return { subtotal, taxa, total: subtotal + taxa };
}

export const formatarBRL = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
