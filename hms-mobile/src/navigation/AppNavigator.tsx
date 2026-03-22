import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PatientsScreen from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import AddPatientScreen from '../screens/AddPatientScreen';
import DiagnoseScreen from '../screens/DiagnoseScreen';
import SyncScreen from '../screens/SyncScreen';
import AiImagingScreen from '../screens/AiImagingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOpts = {
  headerStyle: { backgroundColor: '#111827' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
  contentStyle: { backgroundColor: '#0a0f1e' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOpts,
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#1f2937', borderTopWidth: 1, height: 65, paddingBottom: 10 },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#4b5563',
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = {
            Home: focused ? '🏠' : '🏡',
            Patients: focused ? '👥' : '👤',
            Diagnose: focused ? '🩺' : '🩻',
            Sync: focused ? '🔄' : '🔁',
          };
          return <Text style={{ fontSize: 22 }}>{icons[route.name] || '📄'}</Text>;
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'HMS Home', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Patients', tabBarLabel: 'Patients' }} />
      <Tab.Screen name="Imaging" component={AiImagingScreen} options={{ title: 'AI Imaging Lab', tabBarLabel: 'Imaging' }} />
      <Tab.Screen name="Diagnose" component={DiagnoseScreen} options={{ title: 'AI Diagnosis', tabBarLabel: 'Diagnose' }} />
      <Tab.Screen name="Sync" component={SyncScreen} options={{ title: 'Data Sync', tabBarLabel: 'Sync' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // splash would go here

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOpts}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Patient Details' }} />
            <Stack.Screen name="AddPatient" component={AddPatientScreen} options={{ title: 'Add Patient' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
