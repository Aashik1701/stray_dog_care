import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthProvider';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import AddDogScreen from '../screens/AddDogScreen';
import DogsScreen from '../screens/DogsScreen';
import DogDetailScreen from '../screens/DogDetailScreen';
import SplashScreen from '../screens/SplashScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dogs') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'AddDog') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dogs" component={DogsScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen 
        name="AddDog" 
        component={AddDogScreen} 
        options={{ tabBarLabel: 'Add Dog' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef();

  // Debug logging
  useEffect(() => {
    console.log('🧭 Navigation state:', { 
      hasUser: !!user, 
      userId: user?._id, 
      email: user?.email, 
      loading,
      userObject: user ? Object.keys(user) : null,
      currentRoute: navigationRef.current?.getCurrentRoute()?.name
    });
  }, [user, loading]);

  // Navigate based on auth state changes
  useEffect(() => {
    if (loading) return; // Don't navigate while loading
    
    // Add a small delay to ensure state is stable
    const timeoutId = setTimeout(() => {
      if (!navigationRef.current) return;
      
      const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
      
      if (user && currentRoute !== 'Main' && currentRoute !== 'DogDetail' && currentRoute !== 'ChangePassword') {
        console.log('🚀 Navigating to Main (user authenticated)', { userId: user._id });
        try {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } catch (error) {
          console.error('❌ Navigation error:', error);
        }
      } else if (!user && currentRoute !== 'Login' && currentRoute !== 'Register' && currentRoute !== 'ForgotPassword' && currentRoute !== 'ResetPassword') {
        console.log('🚪 Navigating to Login (user not authenticated)');
        try {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } catch (error) {
          console.error('❌ Navigation error:', error);
        }
      }
    }, 100); // Small delay to ensure state is stable
    
    return () => clearTimeout(timeoutId);
  }, [user, loading]);

  // Determine initial route based on auth state
  const getInitialRouteName = () => {
    if (loading) return 'Splash';
    if (user) return 'Main';
    return 'Login';
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
        if (previousRouteName !== currentRouteName) {
          console.log('📍 Route changed:', previousRouteName, '->', currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRouteName()}
      >
        {/* Always define all screens, navigation will handle showing the right one */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="DogDetail" component={DogDetailScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
