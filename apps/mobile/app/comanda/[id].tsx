import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatarBRL, type ComandaDetalhe } from '@bar/shared';
import { api } from '../../lib/api';
import { cores, statusCor, statusLabel } from '../../lib/theme';

export default function Comanda() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: c, isLoading } = useQuery({ queryKey: ['comanda', id], queryFn: () => api<ComandaDetalhe>(`/comandas/${id}`) });

  const entregar = useMutation({
    mutationFn: (itemId: string) => api(`/itens/${itemId}/status`, { method: 'PATCH', body: { status: 'ENTREGUE' } }),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  });

  if (isLoading || !c) return <ActivityIndicator style={{ flex: 1 }} color={cores.ocupada} />;
  const aberta = c.status === 'ABERTA';

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Mesa ${c.mesa.numero}` }} />
      <FlatList
        data={c.itens}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: cores.muted }}>Nenhum item ainda. Toque em "Lançar itens".</Text>}
        renderItem={({ item: i }) => (
          <View style={s.item}>
            <View style={{ flex: 1 }}>
              <Text style={[s.nome, i.status === 'CANCELADO' && { textDecorationLine: 'line-through', color: cores.muted }]}>
                {i.quantidade}× {i.nomeProduto}
              </Text>
              <Text style={{ color: statusCor[i.status], fontSize: 13 }}>{statusLabel[i.status]}</Text>
            </View>
            {aberta && i.status === 'PRONTO' && (
              <Pressable style={s.entregar} onPress={() => entregar.mutate(i.id)}>
                <Text style={{ color: '#0b2410', fontWeight: '700' }}>Entregue</Text>
              </Pressable>
            )}
            <Text style={s.preco}>{formatarBRL(i.quantidade * i.precoCentavos)}</Text>
          </View>
        )}
      />
      <View style={s.rodape}>
        <Text style={s.total}>Total {formatarBRL(c.totais.total)}</Text>
        <Text style={{ color: cores.muted, marginBottom: 10 }}>Inclui {c.taxaServicoPct}% de serviço</Text>
        {aberta && (
          <Pressable style={s.botao} onPress={() => router.push(`/lancar/${c.id}`)}>
            <Text style={s.botaoTxt}>Lançar itens</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: cores.line },
  nome: { color: cores.text, fontSize: 16 },
  preco: { color: cores.text, minWidth: 80, textAlign: 'right' },
  entregar: { backgroundColor: cores.pronto, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  rodape: { padding: 16, borderTopWidth: 1, borderColor: cores.line, backgroundColor: cores.panel },
  total: { color: cores.text, fontSize: 22, fontWeight: '700' },
  botao: { backgroundColor: cores.ocupada, borderRadius: 10, padding: 16, alignItems: 'center' },
  botaoTxt: { color: '#201808', fontWeight: '700', fontSize: 16 },
});
