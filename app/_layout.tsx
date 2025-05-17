import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen
          name="anime-details/[animeId]"
          options={{
            headerShown: false,
            // Or if you want a custom header:
            // title: "Anime Details",
          }}
        />
        <Stack.Screen
          name="watch/[animeId]"
          options={{
            headerShown: false,
            // Or if you want a custom header:
            // title: "Video Player",
          }}
        />
        <Stack.Screen
          name="genre/[genre]"
          options={{
            headerShown: false,
            // Or if you want a custom header:
            // title: "Genre",
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
