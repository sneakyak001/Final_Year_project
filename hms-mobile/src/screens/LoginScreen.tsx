import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        {/* Logo / Header */}
        <View style={styles.logoBox}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>⚕</Text>
          </View>
          <Text style={styles.appName}>HMS Mobile</Text>
          <Text style={styles.tagline}>Hospital Management System</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="doctor@hms.local"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.pwRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="••••••••"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw(s => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Demo Accounts</Text>
          <Text style={styles.hintText}>Admin: admin@hms.local / Admin@123</Text>
          <Text style={styles.hintText}>Doctor: doctor@hms.local / Doctor@123</Text>
          <Text style={styles.hintText}>Staff: staff@hms.local / Staff@123</Text>
        </View>

        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>🔒 Works Offline • Local Auth</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#111827', borderRadius: 20, padding: 28, shadowColor: '#00d4ff', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  logoBox: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#3b82f6' },
  logoText: { fontSize: 34 },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  label: { color: '#9ca3af', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#374151', marginBottom: 4 },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 14, backgroundColor: '#1f2937', borderRadius: 10, borderWidth: 1, borderColor: '#374151' },
  eyeText: { fontSize: 18 },
  loginBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 22 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hintBox: { marginTop: 20, backgroundColor: '#1f2937', borderRadius: 10, padding: 12 },
  hintTitle: { color: '#60a5fa', fontWeight: '600', fontSize: 12, marginBottom: 6 },
  hintText: { color: '#9ca3af', fontSize: 11, marginBottom: 2 },
  offlineBadge: { marginTop: 16, alignItems: 'center' },
  offlineText: { color: '#4b5563', fontSize: 12 },
});
