import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { AlertProvider } from './components/CustomAlert';
import { ThemeProvider } from './context/ThemeContext';

import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/Signup';
import ForgotPassword from './screens/ForgotPassword';
import AdminTabNavigator from './navigation/AdminTabNavigator';
import StudentTabNavigator from './navigation/StudentTabNavigator';
import ClubLeaderTabNavigator from './navigation/ClubLeaderTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('@onboarding_completed');
      setIsOnboardingCompleted(value === 'true');
    } catch (error) {
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <AlertProvider>
    <ThemeProvider>
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isOnboardingCompleted ? "Login" : "OnboardingScreen"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="AdminFlow" component={AdminTabNavigator} />
        <Stack.Screen name="StudentFlow" component={StudentTabNavigator} />
        <Stack.Screen name="ClubLeaderFlow" component={ClubLeaderTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
    </ThemeProvider>
    </AlertProvider>
  );
}
