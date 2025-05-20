import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DictionaryEntry } from './dictionary';

export interface WordDetailParams {
  entry: DictionaryEntry;
}

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  WordDetail: WordDetailParams;
  Favorites: undefined;
  VoicetubeSearch: undefined;
  YahooSearch: undefined;
  CambridgeSearch: undefined;
}; 

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>; 