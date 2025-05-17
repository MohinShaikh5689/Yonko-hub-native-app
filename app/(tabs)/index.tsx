import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Skeleton component for loading animations
const SkeletonPlaceholder = ({ width, height, style }: { width: number | string, height: number | string, style?: any }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#424242',
          borderRadius: 6,
          opacity
        },
        style
      ]}
    />
  );
};

interface Anime {
  id: number;
  title: string;
  episodes: number | string;
  rating: number | string;
  image: string;
  synopsis?: string;
  banner?: string;
  year?: number;
  genres?: string[];
  status?: string;
  currentEpisode?: number;
  airingTime?: string;
  timeUntil?: number;
  bountyValue?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [airingAnime, setAiringAnime] = useState<Anime[]>([]);
  const [recommendedAnime, setRecommendedAnime] = useState<Anime[]>([]);
  const [featuredAnime, setFeaturedAnime] = useState<Anime[]>([]);
  const [movies, setMovies] = useState<Anime[]>([]);
  const [watchlist, setWatchlist] = useState<Anime[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    airing: true,
    recommended: true,
    featuredAnime: true,
    movies: true,
    watchlist: true,
    continueWatching: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const featuredScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Keep your existing fetch functions unchanged
  const fetchAiringAnime = async () => {
    // Your existing code
    try {
      const query = `
        query {
          Page(page: 1, perPage: 20) {
            media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false, tag_not_in: ["Ecchi", "Hentai", "Lolicon", "Shotacon"]) {
              id
              title {
                romaji
                english
                native
              }
              episodes
              description(asHtml: false)
              averageScore
              coverImage {
                large
              }
              nextAiringEpisode {
                episode
              }
            }
          }
        }
      `;

      const response = await axios.post('https://graphql.anilist.co', {
        query
      });

      const data = response.data.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        episodes: anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : anime.episodes || "?",
        rating: anime.averageScore ? anime.averageScore / 10 : "N/A",
        image: anime.coverImage.large,
        synopsis: anime.description?.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').substring(0, 120) + '...'
      }));

      setAiringAnime(data);
      setLoading(prev => ({ ...prev, airing: false }));
    } catch (error) {
      setLoading(prev => ({ ...prev, airing: false }));
      setError("Failed to load airing anime data.");
    }
  };

  // Keep your other fetch functions unchanged
  const fetchRecommendedAnime = async () => {
    // Your existing code
    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;

      const query = `
        query {
          Page(page: ${randomPage}, perPage: 20) {
            media(type: ANIME, sort: SCORE_DESC, isAdult: false, tag_not_in: ["Ecchi", "Hentai", "Lolicon", "Shotacon"]) {
              id
              title {
                romaji
                english
                native
              }
              episodes
              description(asHtml: false)
              averageScore
              coverImage {
                large
              }
            }
          }
        }
      `;

      const response = await axios.post('https://graphql.anilist.co', {
        query
      });

      const data = response.data.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        episodes: anime.episodes || "?",
        rating: anime.averageScore ? anime.averageScore / 10 : "N/A",
        image: anime.coverImage.large,
        synopsis: anime.description?.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').substring(0, 120) + '...'
      }));
      setRecommendedAnime(data);
      setLoading(prev => ({ ...prev, recommended: false }));
    } catch (error) {
      setError("Failed to load recommended anime data.");
      setLoading(prev => ({ ...prev, recommended: false }));
    }
  };

  const fetchFeaturedAnime = async () => {
    // Your existing code
    try {
      const query = `
        query {
          Page(page: 1, perPage: 11) {
            media(type: ANIME, sort: TRENDING_DESC, isAdult: false, tag_not_in: ["Ecchi", "Hentai"]) {
              id
              title { english romaji }
              description(asHtml: false)
              bannerImage
              coverImage { large }
              averageScore
              genres
              seasonYear
              status
              episodes
            }
          }
        }
      `;

      const response = await axios.post('https://graphql.anilist.co', { query });

      // Filter out anime without banner images
      const data = response.data.data.Page.media
        .filter((anime: any) => anime.bannerImage)
        .map((anime: any) => ({
          id: anime.id,
          title: anime.title.english || anime.title.romaji,
          synopsis: anime.description?.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').substring(0, 200) + '...',
          banner: anime.bannerImage,
          image: anime.coverImage.large,
          rating: anime.averageScore ? anime.averageScore / 10 : "N/A",
          year: anime.seasonYear,
          episodes: anime.episodes || "?",
          genres: anime.genres.slice(0, 3),
          status: anime.status
        }));
      setFeaturedAnime(data);
      setLoading(prev => ({ ...prev, featuredAnime: false }));
    } catch (error) {
      setError("Failed to load featured anime data.");
      setLoading(prev => ({ ...prev, featuredAnime: false }));
    }
  };

  const fetchMovies = async () => {
    // Your existing code
    try {
      const query = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
        id
        title {
          romaji
          english
          native
        }
        episodes
        description(asHtml: false)
        averageScore
        genres
        status
        coverImage {
          large
        }
      }
    }
  }
`;

      const response = await axios.post('https://graphql.anilist.co', { query });
      const data = response.data.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        episodes: anime.episodes || "?",
        rating: anime.averageScore ? anime.averageScore / 10 : "N/A",
        image: anime.coverImage.large,
        synopsis: anime.description?.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').substring(0, 120) + '...'
      }));
      setMovies(data);
      setLoading(prev => ({ ...prev, movies: false }));
    } catch (error) {
      setError("Failed to load movies data.");
      setLoading(prev => ({ ...prev, movies: false }));
    }
  }

  const fetchWatchlist = async () => {
    // Your existing code
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setLoading(prev => ({ ...prev, watchlist: false }));
      return;
    }

    try {
      const response = await axios.get('https://mugiwarahubbackend-production.up.railway.app/api/watchlist', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      const data = response.data.slice(0, 10).map((anime: any) => ({
        id: anime.AnimeId,
        title: anime.English_Title,
        image: anime.Image_url,
        synopsis: anime.synopsis?.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').substring(0, 120) + '...'
      }));

      setWatchlist(data);
      setLoading(prev => ({ ...prev, watchlist: false }));
    } catch (error) {
      console.error("Failed to load watchlist data:", error);
      // Just set empty array instead of error
      setWatchlist([]);
      setLoading(prev => ({ ...prev, watchlist: false }));
    }
  }

  const fetchContinueWatching = async () => {
    // Your existing code
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      setLoading(prev => ({ ...prev, continueWatching: false }));
      return;
    }

    try {
      const response = await axios.get('https://mugiwarahubbackend-production.up.railway.app/api/continueWatching/get', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data.map((anime: any) => ({
        id: anime.AnimeId,
        title: anime.title,
        image: anime.image,
        episode: anime.episodeId,
      }));

      setContinueWatching(data);
      setLoading(prev => ({ ...prev, continueWatching: false }));
    } catch (error) {
      console.error("Failed to load continue watching data:", error);
      // Just set empty array instead of error
      setContinueWatching([]);
      setLoading(prev => ({ ...prev, continueWatching: false }));
    }
  }

  useEffect(() => {
    fetchContinueWatching();
    fetchAiringAnime();
    fetchRecommendedAnime();
    fetchFeaturedAnime();
    fetchMovies();
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await AsyncStorage.getItem('token');
      const expiryDate = await AsyncStorage.getItem('expiryDate');
      
      if (token && expiryDate) {
        const expiry = new Date(expiryDate);
        const date = new Date();
        if (expiry > date) {
          return;
        } else {
          // Token expired
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('expiryDate');
          router.push('/login');
          return;
        }
      }

      if (!token) {
        router.push('/login');
      }
      
    };

    fetchToken();
  }, []);

  // Add auto-scroll functionality for featured carousel
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (featuredAnime.length <= 1 || loading.featuredAnime) return;

    const autoScrollInterval = setInterval(() => {
      if (featuredScrollRef.current) {
        const nextIndex = (currentFeaturedIndex + 1) % featuredAnime.length;
        featuredScrollRef.current.scrollTo({
          x: nextIndex * width,
          animated: true
        });
        setCurrentFeaturedIndex(nextIndex);
      }
    }, 5000); // Auto scroll every 5 seconds

    return () => clearInterval(autoScrollInterval);
  }, [currentFeaturedIndex, featuredAnime, loading.featuredAnime, width]);

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchAiringAnime();
            fetchRecommendedAnime();
            fetchFeaturedAnime();
            fetchMovies();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const renderFeaturedCarousel = () => {
    if (loading.featuredAnime) {
      return (
        <View style={styles.featuredContainer}>
          <View style={styles.featuredSkeletonContainer}>
            <SkeletonPlaceholder
              width={width}
              height={480}
              style={{ borderRadius: 0 }}
            />
            <View style={styles.skeletonContentContainer}>
              <SkeletonPlaceholder width={width * 0.7} height={30} style={{ marginBottom: 20 }} />
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <SkeletonPlaceholder width={60} height={20} style={{ marginRight: 8, borderRadius: 12 }} />
                <SkeletonPlaceholder width={90} height={20} style={{ marginRight: 8, borderRadius: 12 }} />
                <SkeletonPlaceholder width={70} height={20} style={{ borderRadius: 12 }} />
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                <SkeletonPlaceholder width={70} height={24} style={{ marginRight: 8, borderRadius: 12 }} />
                <SkeletonPlaceholder width={90} height={24} style={{ marginRight: 8, borderRadius: 12 }} />
              </View>
              <SkeletonPlaceholder width={140} height={40} style={{ borderRadius: 20 }} />
            </View>
          </View>
        </View>
      );
    }

    if (featuredAnime.length === 0) return null;

    function navigateToAnimeDetails(id: number): void {
      router.push(`/anime-details/${id}`);
    }

    return (
      <View style={styles.featuredContainer}>
        <ScrollView
          ref={featuredScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentFeaturedIndex(newIndex);
          }}
        >
          {featuredAnime.map((featured) => (
            <View key={featured.id} style={[styles.featuredItem, { width }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigateToAnimeDetails(featured.id)}
                style={{ flex: 1 }}
              >
                <Image
                  source={{ uri: featured.image }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                  style={styles.gradient}
                >
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle}>{featured.title}</Text>

                    <View style={styles.infoRow}>
                      {featured.year && (
                        <View style={styles.infoPill}>
                          <Text style={styles.infoText}>{featured.year}</Text>
                        </View>
                      )}

                      {featured.episodes && (
                        <View style={styles.infoPill}>
                          <Text style={styles.infoText}>
                            {featured.episodes} {parseInt(featured.episodes.toString()) === 1 ? 'Episode' : 'Episodes'}
                          </Text>
                        </View>
                      )}

                      {featured.rating && featured.rating !== 'N/A' && (
                        <View style={styles.ratingPill}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText}>{featured.rating}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.genresContainer}>
                      {featured.genres?.map((genre, idx) => (
                        <Text key={idx} style={styles.genrePill}>
                          {genre}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => navigateToAnimeDetails(featured.id)}
                      >
                        <Ionicons name="play" size={18} color="#FFFFFF" />
                        <Text style={styles.playButtonText}>Watch Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Update the renderSectionHeader function to remove the See All option
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Update renderAnimeSection to handle continue watching differently
  const renderAnimeSection = (title: string, data: any[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <View style={styles.sectionContainer}>
          {renderSectionHeader(title)}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carouselContainer}
            contentContainerStyle={styles.carouselContent}
          >
            {[1, 2, 3, 4, 5].map((_, index) => (
              <View key={index} style={styles.animeCard}>
                <SkeletonPlaceholder
                  width={140}
                  height={200}
                  style={{ borderRadius: 12 }}
                />
                <SkeletonPlaceholder
                  width={120}
                  height={16}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (data.length === 0) return null;

    function navigateToAnimeDetails(id: number, anime?: any): void {
      // For continue watching, redirect directly to watch page instead of details
      if (title === 'Continue Watching' && anime && anime.episode) {
        router.push(`/watch/${anime.episode}`);
      } else {
        router.push(`/anime-details/${id}`);
      }
    }

    return (
      <View style={styles.sectionContainer}>
        {renderSectionHeader(title)}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carouselContainer}
          contentContainerStyle={styles.carouselContent}
        >
          {data.map((anime) => (
            <TouchableOpacity
              key={anime.id}
              style={styles.animeCard}
              activeOpacity={0.8}
              onPress={() => navigateToAnimeDetails(anime.id, anime)}
            >
              <View style={styles.cardImageContainer}>
                <Image
                  source={{ uri: anime.image }}
                  style={styles.animeImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.cardGradient}
                >
                  {anime.rating && anime.rating !== 'N/A' && (
                    <View style={styles.cardRatingContainer}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.cardRatingText}>{anime.rating}</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
              <Text style={styles.animeTitle} numberOfLines={1}>
                {anime.title}
              </Text>
              {anime.episode && (
                <View style={styles.episodeBadge}>
                  <Text style={styles.episodeText}>Continue</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {renderFeaturedCarousel()}

        {/* Only render continue watching if there's data */}
        {continueWatching.length > 0 && renderAnimeSection(
          'Continue Watching',
          continueWatching,
          loading.continueWatching
        )}

        {renderAnimeSection(
          'Top Airing',
          airingAnime,
          loading.airing
        )}

        {renderAnimeSection(
          'Recommended For You',
          recommendedAnime,
          loading.recommended
        )}

        {renderAnimeSection(
          'Movies',
          movies,
          loading.movies
        )}

        {/* Only render watchlist if there's data */}
        {watchlist.length > 0 && renderAnimeSection(
          'My Watchlist',
          watchlist,
          loading.watchlist
        )}

        <View style={styles.footer} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#9B81E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  // Featured section styles
  featuredContainer: {
    height: 480,
    position: 'relative',
  },
  featuredItem: {
    height: 480,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  featuredContent: {
    gap: 12,
  },
  featuredTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
    width: '80%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  infoPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  infoText: {
    color: 'white',
    fontSize: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  genrePill: {
    color: '#FFFFFF',
    fontSize: 12,
    backgroundColor: 'rgba(155, 129, 229, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  playButton: {
    backgroundColor: '#9B81E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    minWidth: 140,
  },
  playButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  myListButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 120,
  },
  myListButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Section styles
  sectionContainer: {
    marginTop: 28,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  seeAllText: {
    color: '#9B81E5',
    fontSize: 14,
    fontWeight: '600',
  },
  carouselContainer: {
    flexDirection: 'row',
  },
  carouselContent: {
    paddingRight: 16,
  },
  animeCard: {
    marginRight: 12,
    width: 140,
  },
  cardImageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  animeImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  cardRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  cardRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  animeTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  episodeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#9B81E5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  episodeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  footer: {
    height: 50,
  },
  featuredSkeletonContainer: {
    position: 'relative',
    height: '100%',
  },
  skeletonContentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
  },
  cardSkeletonContainer: {
    flexDirection: 'row',
  },
});