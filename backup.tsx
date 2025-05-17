import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import VideoPlayer from '@/components/VideoPlayer';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

interface Source {
  url: string;
  isM3U8: boolean;
  quality: string;
  isDub: boolean;
}

interface Episode {
  headers: {
    Referer: string;
  };
  sources: Source[];
}

export default function HomeScreen() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisode = async () => {
    try {
      const response = await axios.get(
        'https://yonkohubproxyserver-production-70eb.up.railway.app/api/watch/d58fc9f8-582e-fdf0-3618-112cd54ed5ab/7e06a81df125e19030c51d2aa7f491faec9e6ee1bce6c913573d6af2058cd148'
      );
      setEpisode(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching episode:', error);
      setError('Failed to load episode data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisode();
  }, []);

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Anime Player</ThemedText>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : episode && episode.sources.length > 0 ? (
          <VideoPlayer
            source={episode.sources[0]} // just use first source
            referer={episode.headers.Referer}
          />
        ) : (
          <ThemedText style={styles.errorText}>No episode data available</ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 32,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 32,
  },
});
