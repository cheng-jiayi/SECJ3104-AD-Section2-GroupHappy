/**
 * EcoMap React Native App
 * UTM Recycling Bin Finder
 */

import React from 'react';
import { StatusBar, useColorScheme, SafeAreaView, View, Text, StyleSheet, Button} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';



// Subsystem 3 Module 2 - EcoMap Screens
import EcoMapScreen from './src/Ecomap/screens/EcoMapScreen';
import ReportScreen from './src/Ecomap/screens/ReportScreen';
import FilterScreen from './src/Ecomap/screens/FilterScreen';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UTM ReMerit App</Text>
      <Text style={styles.subtitle}>Recycle for Merit</Text>
      
      <View style={styles.buttonContainer}>

        <View style={styles.buttonWrapper}>
          <Button
            title="Start Eco Map"
            onPress={() => navigation.navigate('EcoMapScreen')}
            color="#4CAF50"
          />
        </View>
      </View>
    </View>
  );
}

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Home Screen */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'UTM ReMerit' }}
        />
        
        {/* EcoMap Screens */}
        <Stack.Screen 
          name="EcoMapMain" 
          component={EcoMapScreen}
          options={{ 
            title: 'UTM EcoMap',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Report" 
          component={ReportScreen}
          options={{ 
            title: 'Report Issue',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="Filter" 
          component={FilterScreen}
          options={{ 
            title: 'Filter Bins',
            headerShown: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#4CAF50',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
  },
  buttonWrapper: {
    marginVertical: 10,
  },
});

export default App;