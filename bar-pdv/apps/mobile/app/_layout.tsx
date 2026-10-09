import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../lib/auth';
import { useRealtime } from '../lib/realtime';
import { cores } from '../lib/theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5000, retry: 1 } } });

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useRealtime(!!user);

  useEffect(() => {
    if (loading) return;
    const naLogin = segments[0] === 'login';
    if (!user && !naLogin) router.replace('/login');
    if (user && naLogin) router.replace('/');
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: cores.panel }, headerTintColor: cores.text, contentStyle: { backgroundColor: cores.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Mesas' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="comanda/[id]" options={{ title: 'Comanda' }} />
      <Stack.Screen name="lancar/[id]" options={{ title: 'Lançar itens' }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
