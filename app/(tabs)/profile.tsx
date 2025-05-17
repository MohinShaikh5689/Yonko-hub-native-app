import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 24;

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

interface Profile {
  id: number;
  email: string;
  name: string;
  profile: string;
  gender: string;
}

interface Watchlist {
  AnimeId: number;
  English_Title: string;
  Japanese_Title: string;
  synopsis: string;
  Image_url: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [watchlist, setWatchlist] = useState<Watchlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const retrieveData = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.get('https://mugiwarahubbackend-production.up.railway.app/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      setProfile(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  const getWatchList = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const response = await axios.get('https://mugiwarahubbackend-production.up.railway.app/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      setWatchlist(response.data);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setRefreshing(true);
    retrieveData();
    getWatchList();
  };
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      router.push('/login');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  useEffect(() => {
    retrieveData();
    getWatchList();
  }, []);

  const renderAnimeCard = ({ item }: { item: Watchlist }) => (
    <TouchableOpacity 
      style={styles.animeCard}
      onPress={() => router.push(`/anime-details/${item.AnimeId}`)}
    >
      <Image 
        source={{ uri: item.Image_url }} 
        style={styles.animeImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.95)']}
        style={styles.cardGradient}
      >
        <ThemedText style={styles.animeTitle} numberOfLines={2}>
          {item.English_Title}
        </ThemedText>
        {item.Japanese_Title && (
          <ThemedText style={styles.japaneseTitle} numberOfLines={1}>
            {item.Japanese_Title}
          </ThemedText>
        )} 
      </LinearGradient>
    </TouchableOpacity>
  );
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView style={styles.scrollView}>
          {/* Hero Section with Background Skeleton */}
          <View style={styles.heroBanner}>
            <LinearGradient
              colors={['rgba(30,20,60,0.7)', 'rgba(30,20,60,0.9)']}
              style={styles.heroGradient}
            >
              {/* Profile Image Skeleton */}
              <View style={styles.profileBadge}>
                <SkeletonPlaceholder 
                  width={110} 
                  height={110} 
                  style={{ borderRadius: 55 }} 
                />
                <View
                  style={[styles.editButton, { backgroundColor: '#424242' }]}
                />
              </View>
              
              {/* Profile Name & Email Skeleton */}
              <View style={styles.nameContainer}>
                <SkeletonPlaceholder width={150} height={28} style={{ marginBottom: 8 }} />
                <SkeletonPlaceholder width={180} height={16} />
              </View>
            </LinearGradient>
          </View>

          {/* Stats Card Skeleton */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <SkeletonPlaceholder width={40} height={24} style={{ marginBottom: 6 }} />
              <SkeletonPlaceholder width={60} height={16} />
            </View>
          </View>
          
          {/* Logout Button Skeleton */}
          <SkeletonPlaceholder 
            width={width - 40} 
            height={44} 
            style={{ 
              alignSelf: 'center', 
              marginTop: 20,
              borderRadius: 25 
            }} 
          />

          {/* Watchlist Skeleton */}
          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={[styles.animeCard, { backgroundColor: 'transparent' }]}>
                  <SkeletonPlaceholder 
                    width={CARD_WIDTH} 
                    height={250} 
                    style={{ borderRadius: 12 }} 
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#9B81E5"
          />
        }
      >
        {/* Hero Section with Background */}
        <ImageBackground
          source={require('../../assets/images/8c88b9fe27b508404b1627f48dbd55a9.jpg')}
          style={styles.heroBanner}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(30,20,60,0.9)']}
            style={styles.heroGradient}
          >
            {/* Profile Badge */}
            <View style={styles.profileBadge}>
              <Image
                source={{ 
                  uri: profile?.profile || 'https://i.imgur.com/6VBx3io.png'
                }}
                style={styles.profileImage}
              />              <LinearGradient
                colors={['#9B81E5', '#6A4BCC']}
                style={styles.editButton}
              >
                <TouchableOpacity >
                  <MaterialCommunityIcons name="pencil" size={18} color="white" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
            
            {/* Profile Name & Email */}
            <View style={styles.nameContainer}>
              <ThemedText style={styles.profileName}>
                {profile?.name || 'Anime Fan'} 
              </ThemedText>
              <ThemedText style={styles.profileEmail}>
                {profile?.email || 'user@example.com'}
              </ThemedText>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{watchlist.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Watchlist</ThemedText>
          </View>
        </View>
        
        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>

        {/* My Watchlist Section */}
        <View style={styles.sectionContainer}>
          {watchlist.length > 0 ? (
            <FlatList
              data={watchlist}
              renderItem={renderAnimeCard}
              keyExtractor={(item) => item.AnimeId.toString()}
              horizontal={false}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.watchlistContainer}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="playlist-remove" size={60} color="#9B81E5" />
              <ThemedText style={styles.emptyStateText}>
                Your watchlist is empty
              </ThemedText>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => router.push('/')}
              >
                <LinearGradient
                  colors={['#9B81E5', '#6A4BCC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.browseGradient}
                >
                  <ThemedText style={styles.browseButtonText}>Browse Anime</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  heroBanner: {
    height: 280,
    width: '100%',
  },
  heroGradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  profileBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#9B81E5',
  },
  editButton: {
    position: 'absolute',
    right: -5,
    bottom: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  nameContainer: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    marginTop: -20,
    marginHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  statItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9B81E5',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A4BCC',
    borderRadius: 25,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  logoutText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  sectionContainer: {
    padding: 16,
    marginTop: 10,
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
  },
  seeAllText: {
    color: '#9B81E5',
    fontSize: 14,
  },
  watchlistContainer: {
    paddingBottom: 8,
  },
  animeCard: {
    width: CARD_WIDTH,
    height: 250, // Increased from 200
    marginBottom: 20, // Increased for better spacing
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  animeImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, // Increased from 80 for more space for text
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  animeTitle: {
    color: '#FFFFFF',
    fontSize: 16, // Increased from 14
    fontWeight: 'bold',
    marginBottom: 4,
  },
  japaneseTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  browseButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  browseGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});