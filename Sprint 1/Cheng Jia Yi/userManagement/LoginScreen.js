import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://10.217.99.173:3000/login", {
        username,
        password
      });

      navigation.navigate("UserHome", { user: res.data });

    } catch (err) {
      Alert.alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Login</Text>

      <TextInput placeholder="Username" placeholderTextColor="#000"
        style={styles.input} value={username} onChangeText={setUsername} />

      <TextInput placeholder="Password" placeholderTextColor="#000"
        style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

      <Button title="Login" onPress={handleLogin} color="#4CAF50" />

      <Button title="Go to Register"
        onPress={() => navigation.navigate('Registration')}
        color="#4CAF50"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 25 },
  title: { fontSize: 28, textAlign: 'center', marginBottom: 20, color: '#000' },
  input: { borderWidth: 1, borderRadius: 6, padding: 12, marginBottom: 15, color: '#000' },
});
