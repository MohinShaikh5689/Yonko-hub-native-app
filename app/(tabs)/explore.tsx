import { ThemedView } from '@/components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

// Genre data with color codes, icons, and image paths
const genres: Genre[] = [
  { name: 'Action', color: '#FF5722', icon: 'flame', image: require('../../assets/images/Action.webp') },
  { name: 'Romance', color: '#E91E63', icon: 'heart', image: require('../../assets/images/romance.webp') },
  { name: 'Comedy', color: '#FFEB3B', icon: 'happy', image: require('../../assets/images/comedy.jpg') },
  { name: 'Horror', color: '#212121', icon: 'skull', image: require('../../assets/images/horror.jpg') },
  { name: 'Fantasy', color: '#9C27B0', icon: 'color-wand', image: require('../../assets/images/fantasy.avif') },
  { name: 'Sci-Fi', color: '#3F51B5', icon: 'planet', image: require('../../assets/images/sci-fi.jpg') },
  { name: 'Slice of Life', color: '#4CAF50', icon: 'cafe', image: require('../../assets/images/slice of life.webp') },
  { name: 'Adventure', color: '#FF9800', icon: 'compass', image: require('../../assets/images/adventure.avif') },
  { name: 'Sports', color: '#03A9F4', icon: 'basketball', image: require('../../assets/images/sports.avif') },
  { name: 'Mecha', color: '#607D8B', icon: 'hardware-chip', image: require('../../assets/images/mecha.jpg') },
  { name: 'Drama', color: '#795548', icon: 'film', image: require('../../assets/images/drama.webp') },
  { name: 'Mystery', color: '#673AB7', icon: 'search', image: require('../../assets/images/mystery.webp') },
  { name: 'Supernatural', color: '#009688', icon: 'flash', image: require('../../assets/images/super_natural.webp') },
  { name: 'Music', color: '#FFC107', icon: 'musical-notes', image: require('../../assets/images/music.jpg') },
  { name: 'Psychological', color: '#F44336', icon: 'brain' as any, image: require('../../assets/images/psychological.jpg') },
];

// Genre card component
interface Genre {
  name: string;
  color: string;
  icon: "flame" | "heart" | "happy" | "skull" | "color-wand" | "planet" | "cafe" | "compass" | "basketball" | "hardware-chip" | "film" | "search" | "flash" | "musical-notes";
  image: any;
}

const GenreCard = ({ genre, onPress }: { genre: Genre; onPress: (genre: Genre) => void }) => {
  return (
    <TouchableOpacity
      style={styles.genreCard}
      onPress={() => onPress(genre)}
      activeOpacity={0.7}
    >
      <ImageBackground 
        source={genre.image} 
        style={styles.genreImageBg}
        imageStyle={styles.genreImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', genre.color]}
          style={styles.genreGradient}
        >
          <Text style={styles.genreName}>{genre.name}</Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

// Popular genres section with horizontal scroll
const PopularGenres = ({ onGenrePress }: { onGenrePress: (genre: Genre) => void }) => {
  const popularGenres = genres.slice(0, 6);
  
  return (
    <View style={styles.popularContainer}>
      <Text style={styles.sectionTitle}>Popular Genres</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularContent}
      >
        {popularGenres.map((genre, index) => (
          <TouchableOpacity
            key={index}
            style={styles.popularCard}
            onPress={() => onGenrePress(genre)}
            activeOpacity={0.7}
          >
            <ImageBackground 
              source={genre.image} 
              style={styles.popularImageBg}
              imageStyle={styles.popularImage}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', genre.color]}
                style={styles.popularGradient}
              >
                <Text style={styles.popularGenreName}>{genre.name}</Text>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default function ExploreScreen() {
  const router = useRouter();

  const handleGenrePress = (genre: Genre): void => {
    // Navigate to the genre screen with the genre name
    router.push(`/genre/${genre.name}`);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Popular Genres Section */}
        <PopularGenres onGenrePress={handleGenrePress} />
        
        {/* All Genres Section */}
        <View style={styles.allGenresContainer}>
          <Text style={styles.sectionTitle}>All Genres</Text>
          <View style={styles.genreGrid}>
            {genres.map((genre, index) => (
              <GenreCard
                key={index}
                genre={genre}
                onPress={handleGenrePress}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  popularContainer: {
    paddingVertical: 16,
  },
  popularContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  popularCard: {
    width: 140,
    height: 80,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  popularImageBg: {
    width: '100%',
    height: '100%',
  },
  popularImage: {
    borderRadius: 12,
  },
  popularGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 12,
  },
  popularGenreName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  allGenresContainer: {
    paddingVertical: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  genreCard: {
    width: cardWidth,
    height: 90,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  genreImageBg: {
    width: '100%',
    height: '100%',
  },
  genreImage: {
    borderRadius: 12,
  },
  genreGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  genreName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});