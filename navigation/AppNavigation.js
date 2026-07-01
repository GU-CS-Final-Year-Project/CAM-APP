import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import Signup from '../screens/Signup';
import AdminTabNavigator from './AdminTabNavigator';
import StudentTabNavigator from './StudentTabNavigator';
import ClubLeaderTabNavigator from './ClubLeaderTabNavigator';

const RootStack = createStackNavigator();

const AppNavigation = () => {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Signup" component={Signup} />
        <RootStack.Screen name="AdminFlow" component={AdminTabNavigator} />
        <RootStack.Screen name="StudentFlow" component={StudentTabNavigator} />
        <RootStack.Screen name="ClubLeaderFlow" component={ClubLeaderTabNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigation;
