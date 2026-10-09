export const cores = {
  bg: '#0e1b20', panel: '#16292f', line: '#27414a', text: '#e6efec', muted: '#8fa7a8',
  livre: '#3fb6a8', ocupada: '#eeb04a', perigo: '#e4585f', pronto: '#6fcf7f',
};
export const statusCor: Record<string, string> = {
  PENDENTE: cores.ocupada, EM_PREPARO: '#6fb4ff', PRONTO: cores.pronto, ENTREGUE: cores.muted, CANCELADO: cores.perigo,
};
export const statusLabel: Record<string, string> = {
  PENDENTE: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};
