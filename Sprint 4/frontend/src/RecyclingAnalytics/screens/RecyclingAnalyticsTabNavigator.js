import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import MyPerformanceScreen from './MyPerformanceScreen';
import CommunityOverviewScreen from './CommunityOverviewScreen';
import ComparePerformanceScreen from './ComparePerformanceScreen';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ focused, iconName, label }) => (
  <View style={{
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  }}>
    <MaterialCommunityIcons
      name={iconName}
      size={26}
      color={focused ? '#2E7D32' : '#666'}
    />
    <Text style={{
      fontSize: 11,
      marginTop: 3,
      color: focused ? '#2E7D32' : '#666',
      fontWeight: focused ? '600' : '500',
    }}>
      {label}
    </Text>
  </View>
);

export default function RecyclingAnalyticsTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="MyPerformance"
        component={MyPerformanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              iconName="account" 
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="CommunityOverview"
        component={CommunityOverviewScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              iconName="account-group" 
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="ComparePerformance"
        component={ComparePerformanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              iconName="chart-bar" 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}