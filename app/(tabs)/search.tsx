import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface AnimeResult {
  id: number;
  title: string;
  japanese_title: string;
  episodes: number | string;
  synopsis: string;
  rating: number;
  image: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [animeResults, setAnimeResults] = useState<AnimeResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const fetchSearchResults = async (query: string, page = 1, append = false) => {
    if (!query.trim()) {
      setAnimeResults([]);
      setHasSearched(false);
      return;
    }
    
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      
      // GraphQL query for AniList with pagination
      const graphqlQuery = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              total
              currentPage
              lastPage
              hasNextPage
              perPage
            }
            media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
              id
              title {
                romaji
                english
                native
              }
              episodes
              description
              averageScore
              coverImage {
                large
              }
            }
          }
        }
      `;
      
      const variables = {
        search: decodeURIComponent(query),
        page: page,
        perPage: 20
      };
      
      const response = await axios.post('https://graphql.anilist.co', {
        query: graphqlQuery,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      const results = response.data.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: anime.title.english || anime.title.romaji,
        japanese_title: anime.title.native || anime.title.romaji,
        episodes: anime.episodes || "TBA",
        synopsis: anime.description 
          ? anime.description.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '')
          : "No synopsis available",
        rating: anime.averageScore ? anime.averageScore / 10 : 0,
        image: anime.coverImage.large
      }));

      
      // Update pagination info
      setHasNextPage(response.data.data.Page.pageInfo.hasNextPage);
      setCurrentPage(page);
      
      if (append) {
        setAnimeResults(prev => [...prev, ...results]);
      } else {
        setAnimeResults(results);
      }
      
      setHasSearched(true);
      setLoading(false);
      setLoadingMore(false);
    } catch (error: any) {
      console.error("Error fetching search results:", error.response?.data?.message || error.message);
      setError(error.response?.data?.message || "Something went wrong. Please try again.");
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    Keyboard.dismiss();
    setCurrentPage(1);
    fetchSearchResults(searchQuery, 1, false);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loadingMore) {
      fetchSearchResults(searchQuery, currentPage + 1, true);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setAnimeResults([]);
    setHasSearched(false);
    setCurrentPage(1);
    setHasNextPage(true);
  };

  const handlePopularSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchSearchResults(query, 1, false);
  };

  const navigateToAnimeDetails = (animeId: number) => {
    router.push(`/anime-details/${animeId}`);
  };

  const renderSearchResult = ({ item }: { item: AnimeResult }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => navigateToAnimeDetails(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.resultImage} 
          resizeMode="cover"
        />
        {item.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
        {typeof item.episodes === 'number' && (
          <View style={styles.episodesBadge}>
            <Text style={styles.episodesText}>{item.episodes} eps</Text>
          </View>
        )}
      </View>
      <Text style={styles.resultTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasNextPage) return null;
    
    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.loadMoreText}>Load More</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          {/* Search Header */}
          <View style={styles.searchHeader}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search anime..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            {inputFocused && (
              <TouchableOpacity style={styles.cancelButton} onPress={Keyboard.dismiss}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.skeletonSearchResults}>
                {[1, 2, 3, 4, 5, 6].map(index => (
                  <View key={index} style={styles.resultCard}>
                    <SkeletonPlaceholder 
                      width={cardWidth} 
                      height={cardWidth * 1.4} 
                      style={{ borderRadius: 8 }}
                    />
                    <SkeletonPlaceholder 
                      width={cardWidth * 0.8} 
                      height={16} 
                      style={{ marginTop: 8 }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ): error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={60} color="#9B81E5" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => fetchSearchResults(searchQuery, 1, false)}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : hasSearched && animeResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color="#666" />
              <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
              <Text style={styles.emptySubText}>Try a different search term</Text>
            </View>
          ) : hasSearched ? (
            <FlatList
              data={animeResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.resultRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultContent}
              ListFooterComponent={renderFooter}
              onEndReachedThreshold={0.5}
            />
          ) : (
            <View style={styles.initialStateContainer}>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Popular Searches</Text>
              <View style={styles.popularSearches}>
                {['My Hero Academia', 'Naruto', 'One Punch Man', 'Dragon Ball', 'Your Name', 'Hunter x Hunter', 'Demon Slayer', 'Attack on Titan', 'Jujutsu Kaisen'].map((query, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.popularSearchItem}
                    onPress={() => handlePopularSearch(query)}
                  >
                    <Text style={styles.popularSearchText}>{query}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.searchTipsContainer}>
                <Text style={styles.tipsTitle}>Search Tips</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="information-circle" size={20} color="#9B81E5" />
                  <Text style={styles.tipText}>Search by anime title in English</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="information-circle" size={20} color="#9B81E5" />
                  <Text style={styles.tipText}>Try using fewer keywords for better results</Text>
                </View>
              </View>
            </View>
          )}
        </ThemedView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 8,
    height: '100%',
  },
  clearButton: {
    padding: 5,
  },
  cancelButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: '#9B81E5',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#CCC',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#9B81E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#CCC',
    fontSize: 18,
    marginVertical: 12,
  },
  emptySubText: {
    color: '#999',
    fontSize: 16,
  },
  resultRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  resultContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  resultCard: {
    width: cardWidth,
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: '#2A2A2A',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  episodesBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  episodesText: {
    color: 'white',
    fontSize: 12,
  },
  resultTitle: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  initialStateContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  popularSearchItem: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  popularSearchText: {
    color: 'white',
    fontSize: 14,
  },
  searchTipsContainer: {
    marginTop: 32,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
  },
  tipsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    color: '#CCC',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  skeletonSearchResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%'
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#9B81E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});