import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/userManagement/HomeScreen';
import LoginScreen from './src/screens/userManagement/LoginScreen';
import RegistrationScreen from './src/screens/userManagement/RegistrationScreen';
import EventListScreen from './src/screens/eventRegistration/EventListScreen';

const Stack = createNativeStackNavigator();

function StartScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>UTM ReMerit App</Text>
            <Text style={styles.subtitle}>Recycle for Merit</Text>

            <View style={styles.buttonSpacing}>
                <Button title="User Registration" onPress={() => navigation.navigate('Registration')} color="#4CAF50" />
            </View>

            <View style={styles.buttonSpacing}>
                <Button title="User Login" onPress={() => navigation.navigate('Login')} color="#4CAF50" />
            </View>
        </View>
    );
}

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Start" screenOptions={{
                headerStyle: { backgroundColor: '#4CAF50' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}>
                <Stack.Screen name="Start" component={StartScreen} />
                <Stack.Screen name="Registration" component={RegistrationScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="UserHome" component={HomeScreen} />
                <Stack.Screen name="Events" component={EventListScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#2E7D32', textAlign: 'center' },
    subtitle: { fontSize: 18, marginBottom: 30, color: '#4CAF50', textAlign: 'center' },
    buttonSpacing: { marginBottom: 15, width: '70%' },
});