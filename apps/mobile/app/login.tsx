import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { cores } from '../lib/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('garcom@demo.com');
  const [senha, setSenha] = useState('123456');
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setEnviando(true);
    try {
      await login(email.trim(), senha);
    } catch (e) {
      Alert.alert('Não foi possível entrar', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={s.tela}>
      <Text style={s.titulo}>Bar PDV</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="E-mail" placeholderTextColor={cores.muted} />
      <TextInput style={s.input} value={senha} onChangeText={setSenha} secureTextEntry placeholder="Senha" placeholderTextColor={cores.muted} />
      <Pressable style={s.botao} onPress={entrar} disabled={enviando}>
        {enviando ? <ActivityIndicator color="#201808" /> : <Text style={s.botaoTxt}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: cores.bg },
  titulo: { color: cores.text, fontSize: 32, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: cores.panel, borderColor: cores.line, borderWidth: 1, borderRadius: 10, padding: 14, color: cores.text, fontSize: 16 },
  botao: { backgroundColor: cores.ocupada, borderRadius: 10, padding: 16, alignItems: 'center' },
  botaoTxt: { color: '#201808', fontWeight: '700', fontSize: 16 },
});
