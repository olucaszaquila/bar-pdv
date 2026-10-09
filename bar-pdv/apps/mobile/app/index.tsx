import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatarBRL, type MesaResumo } from '@bar/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cores } from '../lib/theme';

export default function Mesas() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mesas'],
    queryFn: () => api<MesaResumo[]>('/mesas'),
  });
  const abrir = useMutation({
    mutationFn: (mesaId: string) => api<{ id: string }>('/comandas', { method: 'POST', body: { mesaId } }),
    onSuccess: (c) => router.push(`/comanda/${c.id}`),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  });

  function tocar(m: MesaResumo) {
    if (m.comanda) return router.push(`/comanda/${m.comanda.id}`);
    Alert.alert(`Abrir mesa ${m.numero}?`, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir', onPress: () => abrir.mutate(m.id) },
    ]);
  }

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={cores.ocupada} />;

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <Pressable onPress={logout}><Text style={{ color: cores.muted }}>Sair</Text></Pressable> }} />
      <FlatList
        data={data}
        numColumns={3}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 8 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item: m }) => (
          <Pressable onPress={() => tocar(m)} style={[s.mesa, { borderColor: m.comanda ? cores.ocupada : cores.livre }]}>
            <Text style={s.num}>{m.numero}</Text>
            <Text style={{ color: m.comanda ? cores.ocupada : cores.livre }} numberOfLines={1}>
              {m.comanda ? m.comanda.nomeCliente ?? 'Ocupada' : 'Livre'}
            </Text>
            {m.comanda && <Text style={s.total}>{formatarBRL(m.comanda.total)}</Text>}
          </Pressable>
        )}
      />
    </>
  );
}

const s = StyleSheet.create({
  mesa: { flex: 1 / 3, margin: 6, aspectRatio: 1, borderWidth: 2, borderRadius: 14, backgroundColor: cores.panel, padding: 10, justifyContent: 'center' },
  num: { color: cores.text, fontSize: 30, fontWeight: '700' },
  total: { color: cores.text, fontWeight: '600', marginTop: 2 },
});
