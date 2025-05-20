import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import WordDetailScreen from './src/screens/WordDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import VoicetubeSearchScreen from './src/screens/VoicetubeSearchScreen';
import YahooSearchScreen from './src/screens/YahooSearchScreen';
import CambridgeSearchScreen from './src/screens/CambridgeSearchScreen';
import { RootStackParamList } from './src/types/navigation';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ErrorBoundary>
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
              name="Search" 
              component={SearchScreen} 
              options={{ title: 'Search' }}
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
          <Stack.Screen 
            name="VoicetubeSearch" 
            component={VoicetubeSearchScreen} 
            options={{ title: 'Voicetube Dictionary' }}
          />
          <Stack.Screen 
            name="YahooSearch" 
            component={YahooSearchScreen} 
            options={{ title: 'Yahoo Dictionary' }}
          />
          <Stack.Screen 
            name="CambridgeSearch" 
            component={CambridgeSearchScreen} 
            options={{ title: 'Cambridge Dictionary' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
