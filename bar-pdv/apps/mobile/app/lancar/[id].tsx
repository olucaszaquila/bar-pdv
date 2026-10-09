import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatarBRL, type CategoriaComProdutos } from '@bar/shared';
import { api } from '../../lib/api';
import { cores } from '../../lib/theme';

export default function Lancar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const { data = [], isLoading } = useQuery({ queryKey: ['cardapio'], queryFn: () => api<CategoriaComProdutos[]>('/cardapio') });

  const enviar = useMutation({
    mutationFn: () =>
      api(`/comandas/${id}/itens`, {
        method: 'POST',
        body: { itens: Object.entries(cart).filter(([, q]) => q > 0).map(([produtoId, quantidade]) => ({ produtoId, quantidade })) },
      }),
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e: Error) => Alert.alert('Não foi possível enviar', e.message),
  });

  const qtd = Object.values(cart).reduce((a, b) => a + b, 0);
  const mudar = (pid: string, d: number) => setCart((c) => ({ ...c, [pid]: Math.max(0, (c[pid] ?? 0) + d) }));

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={cores.ocupada} />;

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={data.map((c) => ({ title: c.nome, data: c.produtos }))}
        keyExtractor={(p) => p.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => <Text style={s.secao}>{section.title}</Text>}
        renderItem={({ item: p }) => (
          <View style={s.linha}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{p.nome}</Text>
              <Text style={{ color: cores.muted }}>{formatarBRL(p.precoCentavos)}</Text>
            </View>
            <Pressable style={s.passo} onPress={() => mudar(p.id, -1)}><Text style={s.passoTxt}>−</Text></Pressable>
            <Text style={s.qtd}>{cart[p.id] ?? 0}</Text>
            <Pressable style={s.passo} onPress={() => mudar(p.id, 1)}><Text style={s.passoTxt}>+</Text></Pressable>
          </View>
        )}
      />
      <View style={s.rodape}>
        <Pressable style={[s.botao, !qtd && { opacity: 0.4 }]} disabled={!qtd || enviar.isPending} onPress={() => enviar.mutate()}>
          <Text style={s.botaoTxt}>{enviar.isPending ? 'Enviando…' : `Enviar pedido (${qtd})`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  secao: { backgroundColor: cores.bg, color: cores.muted, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: cores.line },
  nome: { color: cores.text, fontSize: 16 },
  passo: { width: 42, height: 42, borderRadius: 10, backgroundColor: cores.panel, borderWidth: 1, borderColor: cores.line, alignItems: 'center', justifyContent: 'center' },
  passoTxt: { color: cores.text, fontSize: 22 },
  qtd: { color: cores.text, minWidth: 24, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  rodape: { padding: 16, borderTopWidth: 1, borderColor: cores.line, backgroundColor: cores.panel },
  botao: { backgroundColor: cores.ocupada, borderRadius: 10, padding: 16, alignItems: 'center' },
  botaoTxt: { color: '#201808', fontWeight: '700', fontSize: 16 },
});
