import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Anime {
  id: number;
  title: {
    english: string;
    romaji: string;
  };
  coverImage: {
    extraLarge: string;
    large: string;
    medium: string;
  };
  description: string;
  episodes: number;
  genres: string[];
  averageScore: number;
}

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - 40) / numColumns;

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
          backgroundColor: '#2A2A2A',
          borderRadius: 6,
          opacity
        },
        style
      ]}
    />
  );
};

// Skeleton Anime Card
const SkeletonAnimeCard = () => (
  <View style={styles.skeletonCard}>
    <SkeletonPlaceholder 
      width="100%" 
      height={itemWidth * 1.5} 
      style={{ borderRadius: 12 }} 
    />
    <View style={styles.animeDetails}>
      <SkeletonPlaceholder width="90%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="60%" height={16} />
    </View>
  </View>
);

// Header image background
const HeaderBackground = ({ genre }: { genre: string }) => {
  const genreBackgrounds: {[key: string]: any} = {
    Action: require('../../assets/images/Action.webp'),
    Romance: require('../../assets/images/romance.webp'),
    Comedy: require('../../assets/images/comedy.jpg'),
    Horror: require('../../assets/images/horror.jpg'),
    Fantasy: require('../../assets/images/fantasy.avif'),
    "Sci-Fi": require('../../assets/images/sci-fi.jpg'),
    "Slice of Life": require('../../assets/images/slice of life.webp'),
    Adventure: require('../../assets/images/adventure.avif'),
    Sports: require('../../assets/images/sports.avif'),
    Mecha: require('../../assets/images/mecha.jpg'),
    Drama: require('../../assets/images/drama.webp'),
    Mystery: require('../../assets/images/mystery.webp'),
    Supernatural: require('../../assets/images/super_natural.webp'),
    Music: require('../../assets/images/music.jpg'),
    Psychological: require('../../assets/images/psychological.jpg'),
  };
  
  // Default background if genre doesn't match
  const backgroundImage = genreBackgrounds[genre as string] || require('../../assets/images/Action.webp');
  
  return (
    <View style={styles.headerImageContainer}>
      <Image 
        source={backgroundImage} 
        style={styles.headerImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(18,18,18,0.3)', 'rgba(18,18,18,0.8)', '#121212']}
        style={styles.headerGradient}
      />
    </View>
  );
};

export default function GenrePage() {
  const { genre } = useLocalSearchParams<{ genre: string }>();
  const router = useRouter();
  
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Header animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [180, 100],
    extrapolate: 'clamp'
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1.2, 1],
    extrapolate: 'clamp'
  });
  
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp'
  });

  // AniList GraphQL query
  const fetchAnimeByGenre = async (currentPage: number, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const query = `
        query ($genre: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              hasNextPage
              currentPage
            }
            media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
              id
              title {
                english
                romaji
              }
              coverImage {
                extraLarge
                large
                medium
              }
              description
              episodes
              genres
              averageScore
            }
          }
        }
      `;

      const response = await axios.post('https://graphql.anilist.co', {
        query,
        variables: {
          genre: genre,
          page: currentPage,
          perPage: 20
        }
      });

      const data = response.data.data.Page;
      const newAnimeList = data.media as Anime[];
      
      setHasNextPage(data.pageInfo.hasNextPage);
      
      if (isLoadMore) {
        setAnimeList(prevList => [...prevList, ...newAnimeList]);
      } else {
        setAnimeList(newAnimeList);
      }
      
      // Fade in animation
      if (!isLoadMore) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
      
    } catch (err: any) {
      console.error("Error fetching anime by genre:", err);
      setError(err.message || "Failed to fetch anime");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (genre) {
      fetchAnimeByGenre(1);
    }
  }, [genre]);

  const loadMoreAnime = () => {
    if (!loadingMore && hasNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAnimeByGenre(nextPage, true);
    }
  };

  const renderAnimeItem = ({ item, index }: { item: Anime, index: number }) => {
    // Create a static animation value - no hooks involved
    const animationStyle = {
      opacity: 1,
      transform: [{ translateY: 0 }]
    };
    
    // If you want to add the entry animation only when first loading items:
    if (page === 1) {
      animationStyle.transform = [{ 
        translateY: index < 10 ? (10 - index) * 5 : 0 
      }];
    }
    
    return (
      <Animated.View style={animationStyle}>
        <TouchableOpacity
          style={styles.animeCard}
          onPress={() => router.push({
            pathname: '/anime-details/[animeId]',
            params: { animeId: item.id }
          })}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.coverImage.large }}
              style={styles.animeImage}
              resizeMode="cover"
            />
            
            {/* Gradient overlay */}
            <LinearGradient 
              colors={['transparent', 'rgba(0,0,0,0.8)']} 
              style={styles.imageGradient}
            />
            
            {/* Episode count badge */}
            {item.episodes && (
              <View style={styles.episodeBadge}>
                <Ionicons name="tv-outline" size={12} color="white" />
                <Text style={styles.episodeCount}>{item.episodes}</Text>
              </View>
            )}
            
            {/* Rating badge */}
            {item.averageScore && (
              <View style={styles.ratingBadge}>
                <FontAwesome5 name="star" size={10} color="#FFD700" solid />
                <Text style={styles.ratingText}>{(item.averageScore / 10).toFixed(1)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.animeDetails}>
            <Text style={styles.animeTitle} numberOfLines={2}>
              {item.title.english || item.title.romaji}
            </Text>
            
            {/* Genres tags */}
            {item.genres && item.genres.length > 0 && (
              <View style={styles.genreTagsContainer}>
                {item.genres.slice(0, 2).map((tag, idx) => (
                  <View key={idx} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{tag}</Text>
                  </View>
                ))}
                {item.genres.length > 2 && (
                  <Text style={styles.moreGenres}>+{item.genres.length - 2}</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render skeleton loading state
  if (loading && !loadingMore) {
    return (
      <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        
        {/* Animated Header Background */}
        <HeaderBackground genre={genre as string} />
        
        {/* Floating Header */}
        <Animated.View 
          style={[
            styles.floatingHeader, 
            { opacity: 1 }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Animated.Text 
            style={[
              styles.floatingHeaderTitle,
              { 
                opacity: 1,
                transform: [{ scale: 1 }]
              }
            ]}
          >
            {genre as string} Anime
          </Animated.Text>
          <View style={styles.placeholderRight} />
        </Animated.View>
        
        <View style={styles.contentContainer}>
          {/* Genre title */}
          <View style={styles.genreTitleContainer}>
            <Text style={styles.genreTitle}>{genre as string}</Text>
            <View style={styles.genreDivider} />
          </View>
          
          {/* Skeleton Grid */}
          <View style={styles.listContainer}>
            <View style={styles.columnWrapper}>
              <SkeletonAnimeCard />
              <SkeletonAnimeCard />
            </View>
            <View style={styles.columnWrapper}>
              <SkeletonAnimeCard />
              <SkeletonAnimeCard />
            </View>
            <View style={styles.columnWrapper}>
              <SkeletonAnimeCard />
              <SkeletonAnimeCard />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle" size={70} color="#9B81E5" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAnimeByGenre(1)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonErrorText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Animated Header Background */}
      <Animated.View 
        style={[
          styles.headerContainer, 
          { height: headerHeight }
        ]}
      >
        <HeaderBackground genre={genre as string} />
      </Animated.View>
      
      {/* Floating Header (becomes visible when scrolling) */}
      <Animated.View 
        style={[
          styles.floatingHeader, 
          { opacity: headerOpacity }
        ]}
      >
        <BlurView intensity={80} tint="dark" style={styles.blurView}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Animated.Text 
            style={[
              styles.floatingHeaderTitle,
              { 
                transform: [
                  { scale: titleScale },
                  { translateY: titleTranslateY }
                ]
              }
            ]}
          >
            {genre as string} Anime
          </Animated.Text>
          <View style={styles.placeholderRight} />
        </BlurView>
      </Animated.View>
      
      {/* Anime Grid */}
      <Animated.FlatList
        data={animeList}
        renderItem={renderAnimeItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        style={{ opacity: fadeAnim }}
        ListHeaderComponent={
          <View style={styles.genreTitleContainer}>
            <Text style={styles.genreTitle}>{genre as string}</Text>
            <View style={styles.genreDivider} />
            <Text style={styles.genreSubtitle}>
              Popular {genre} anime ranked by popularity
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={60} color="#555" />
            <Text style={styles.emptyText}>No {genre} anime found</Text>
          </View>
        }
        ListFooterComponent={
          <>
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#9B81E5" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
            
            {hasNextPage && !loadingMore && (
              <TouchableOpacity 
                style={styles.loadMoreButton} 
                onPress={loadMoreAnime}
                disabled={loadingMore}
              >
                <Text style={styles.loadMoreButtonText}>Load More</Text>
                <Ionicons name="arrow-down" size={18} color="white" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
            
            {!hasNextPage && animeList.length > 0 && (
              <View style={styles.endContainer}>
                <View style={styles.endLine} />
                <View style={styles.endTextContainer}>
                  <Text style={styles.endText}>You've reached the end</Text>
                </View>
                <View style={styles.endLine} />
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
    overflow: 'hidden',
  },
  headerImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  blurView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  floatingHeaderTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderRight: {
    width: 44,
  },
  contentContainer: {
    flex: 1,
    marginTop: 100,
  },
  genreTitleContainer: {
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 16,
  },
  genreTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  genreDivider: {
    height: 3,
    width: 40,
    backgroundColor: '#9B81E5',
    marginVertical: 10,
    borderRadius: 2,
  },
  genreSubtitle: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  animeCard: {
    width: itemWidth,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  skeletonCard: {
    width: itemWidth,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: itemWidth * 1.5,
    position: 'relative',
  },
  animeImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  episodeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeCount: {
    color: 'white',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  animeDetails: {
    padding: 12,
  },
  animeTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  genreTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  genreTag: {
    backgroundColor: 'rgba(155, 129, 229, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  genreTagText: {
    color: '#CCC',
    fontSize: 10,
    fontWeight: '500',
  },
  moreGenres: {
    color: '#888',
    fontSize: 10,
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorText: {
    color: 'white',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#9B81E5',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#9B81E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonError: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  backButtonErrorText: {
    color: '#9B81E5',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  loadMoreButton: {
    backgroundColor: '#9B81E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 25,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#9B81E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  loadMoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: '#9B81E5',
    marginLeft: 10,
    fontSize: 14,
  },
  endContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
  endLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  endTextContainer: {
    paddingHorizontal: 16,
  },
  endText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFD700',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});