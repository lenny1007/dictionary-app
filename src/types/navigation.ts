import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export interface WordDetailParams {
  word: string;
}

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  WordDetail: WordDetailParams;
  Favorites: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>; 