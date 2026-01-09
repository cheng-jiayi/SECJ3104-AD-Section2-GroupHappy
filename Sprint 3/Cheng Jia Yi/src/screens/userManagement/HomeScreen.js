import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ route, navigation }) {
    const user = route.params?.user;

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>No user data!</Text>
                <Button title="Back to Start" onPress={() => navigation.navigate('Start')} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome, {user.name}!</Text>
            <Text style={styles.subtitle}>Role: {user.role}</Text>

            {user.role === 'admin' ? (
                <Text style={styles.roleText}>You have admin access.</Text>
            ) : (
                <>
                    <Button
                        title="View Events"
                        onPress={() => navigation.navigate('Events', { user })}
                        color="#4CAF50"
                    />
                    <View style={{ height: 10 }} />
                    <Button
                        title="My Registered Events"
                        onPress={() => navigation.navigate('MyEvents', { user })}
                        color="#4CAF50"
                    />
                </>
            )}

            <View style={{ height: 20 }} />
            <Button title="Logout" onPress={() => navigation.navigate('Start')} color="#f44336" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
    title: { fontSize: 28, marginBottom: 10, textAlign: 'center', color: '#000' },
    subtitle: { fontSize: 18, marginBottom: 20, color: '#000' },
    roleText: { fontSize: 18, color: '#000', marginBottom: 20 },
});
