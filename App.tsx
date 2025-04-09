import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import WordDetailScreen from './src/screens/WordDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';

export type RootStackParamList = {
  Home: undefined;
  WordDetail: { word: string };
  Favorites: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f4511e',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Dictionary App' }}
          />
          <Stack.Screen 
            name="WordDetail" 
            component={WordDetailScreen} 
            options={{ title: 'Word Details' }}
          />
          <Stack.Screen 
            name="Favorites" 
            component={FavoritesScreen} 
            options={{ title: 'Favorites' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
