import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import MyPerformanceScreen from './src/screens/MyPerformanceScreen';
import CommunityOverviewScreen from './src/screens/CommunityOverviewScreen';
import ComparePerformanceScreen from './src/screens/ComparePerformanceScreen';


const Stack = createNativeStackNavigator();


function HomeScreen({ navigation }) {
 return (
   <View style={styles.container}>
     <Text style={styles.title}>UTM ReMerit App</Text>
     <Text style={styles.subtitle}>Recycle for Merit</Text>


     <View style={styles.buttonContainer}>
       <Button
         title="My Performance"
         color="#4CAF50"
         onPress={() => navigation.navigate('MyPerformance')}
       />
       <View style={styles.spacer} />
       <Button
         title="Community Overview"
         color="#2196F3"
         onPress={() => navigation.navigate('CommunityOverview')}
       />
       <View style={styles.spacer} />
       <Button
         title="Compare Your Performance"
         color="#FF9800"
         onPress={() => navigation.navigate('ComparePerformance')}
       />
     </View>
   </View>
 );
}


export default function App() {
 return (
   <NavigationContainer>
     <Stack.Navigator
       initialRouteName="Home"
       screenOptions={{
         headerStyle: { backgroundColor: '#4CAF50' },
         headerTintColor: '#fff',
         headerTitleStyle: { fontWeight: 'bold' },
       }}
     >
       <Stack.Screen
         name="Home"
         component={HomeScreen}
         options={{ title: 'UTM ReMerit' }}
       />
       <Stack.Screen
         name="MyPerformance"
         component={MyPerformanceScreen}
         options={{ title: 'My Performance' }}
       />
       <Stack.Screen
         name="CommunityOverview"
         component={CommunityOverviewScreen}
         options={{ title: 'Community Overview' }}
       />
       <Stack.Screen
         name="ComparePerformance"
         component={ComparePerformanceScreen}
         options={{ title: 'Compare Performance' }}
       />
     </Stack.Navigator>
   </NavigationContainer>
 );
}


const styles = StyleSheet.create({
 container: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#E8F5E8',
   padding: 20,
 },
 title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
 subtitle: { fontSize: 18, color: '#4CAF50', marginBottom: 30 },
 buttonContainer: { width: '100%' },
 spacer: { height: 10 },
});