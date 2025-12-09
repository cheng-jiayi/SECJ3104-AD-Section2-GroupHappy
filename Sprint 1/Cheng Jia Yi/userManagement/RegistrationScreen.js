import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

export default function RegistrationScreen({ navigation }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');

  const handleRegister = async () => {
    if (!name || !username || !password || !role) {
      Alert.alert("All fields are required");
      return;
    }

    try {
      const res = await axios.post("http://10.217.99.173:3000/register", {
        name,
        username,
        password,
        role
      });

      Alert.alert(res.data.message);
      navigation.navigate("Login");

    } catch (err) {
      Alert.alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Registration</Text>

      <TextInput placeholder="Full Name" placeholderTextColor="#000"
        style={styles.input} value={name} onChangeText={setName} />

      <TextInput placeholder="Username" placeholderTextColor="#000"
        style={styles.input} value={username} onChangeText={setUsername} />

      <TextInput placeholder="Password" placeholderTextColor="#000"
        secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />

      <TextInput placeholder="Role (admin/student)" placeholderTextColor="#000"
        style={styles.input} value={role} onChangeText={setRole} />

      <Button title="Register" color="#4CAF50" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 25 },
  title: { fontSize: 28, marginBottom: 20, textAlign: 'center', color: '#000' },
  input: { borderWidth: 1, borderRadius: 6, padding: 12, marginBottom: 15, color: '#000' }
});
