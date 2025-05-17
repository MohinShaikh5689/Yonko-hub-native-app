import { FontAwesome, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VoiceActor {
    id: number;
    name: {
        full: string;
    };
    image: string;
    language: string;
}

interface Character {
    id: number;
    name: {
        full: string;
    };
    image: string;
    role: string;
    voiceActors: VoiceActor[];
}

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

const { width: screenWidth } = Dimensions.get('window');

interface Anime {
    id: string;
    title: {
        romaji: string;
        english: string;
        native: string;
    };
    synonyms: string[];
    image: string;
    cover: string;
    description: string;
    status: string;
    releaseDate: number;
    color: string;
    episodes: {
        sub: number;
        dub: number;
    };
    trailer: {
        id: string;
        site: string;
        thumbnail: string;
    };
    totalEpisodes: number;
    currentEpisode: number;
    rating: number;
    duration: number;
    genres: string[];
    season: string;
    studios: string[];
    characters: Character[];
}

interface Recommendation {
    id: number;
    image: string;
    rating: number;
    title: string;
}

interface Episode {
    paheId0: string;
    paheId1: string;
    zoroId: string;
    animeId: string;
    image: string;
    epNo: number;
    title?: string;
}

export default function AnimeDetailsScreen() {
    const { animeId } = useLocalSearchParams<{ animeId: string }>(); const router = useRouter();
    const [anime, setAnime] = useState<Anime>();
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [relation, setRelation] = useState<any[]>([]);
    const [inWatchlist, setInWatchlist] = useState(false);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [loadingStates, setLoadingStates] = useState({
        mainContent: true,
        characters: true,
        relations: true,
        recommendations: true,
        episodes: true,
    });
    const [selectedTab, setSelectedTab] = useState<'episodes' | 'characters' | 'related'>('episodes');
    const [episodeData, setEpisodeData] = useState<Episode[]>([]);
    const [expandedSynopsis, setExpandedSynopsis] = useState(false);
    const [selectedEpisodeRange, setSelectedEpisodeRange] = useState(0);
    const [showLoginModal, setShowLoginModal] = useState(false);


    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollY = useRef(new Animated.Value(0)).current;


    // Header animation based on scroll
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100, 150],
        outputRange: [0, 0.7, 1],
        extrapolate: 'clamp',
    });

    // Image parallax effect
    const imageTranslateY = scrollY.interpolate({
        inputRange: [-300, 0, 300],
        outputRange: [50, 0, -50],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (animeId) {
            fetchAnimeDetails(Number(animeId));
            fetchEpisodeData(Number(animeId));
            checkInWatchlist(animeId.toString());
        }
    }, [animeId]);

    const saveDetails = async (id:number, title:string, image:string) => {
        const token = await AsyncStorage.getItem('token');
        
        if (token) {
            const data = await AsyncStorage.getItem('AnimeDetails')
            if (data) {
                const parsedData = JSON.parse(data);
                const exisingAnime = parsedData.find((item: any) => item.id === animeId);
                if (!exisingAnime) {
                    const newAnmie = {
                        id: id,
                        title: title,
                        image: image,
                    }
                    
                    parsedData.push(newAnmie);
                    await AsyncStorage.setItem('AnimeDetails', JSON.stringify(parsedData));
                }
            }else {
                const newAnmie = [{
                    id: id,
                    title: title,
                    image: image,
                }];
                await AsyncStorage.setItem('AnimeDetails', JSON.stringify(newAnmie));
                
            }
        }
    }

    const fetchAnimeDetails = async (id: number) => {
        const response = await axios.get(
            `https://yonkohubproxyserver-production-70eb.up.railway.app/api/info/${id}`
        );

        const animeData = response.data;
        setAnime(animeData);
        setLoadingStates((prev) => ({ ...prev, mainContent: false }));

        if (animeData.characters) {
            animeData.characters = animeData.characters.sort(
                (a: Character, b: Character) => {
                    if (a.role === "MAIN" && b.role !== "MAIN") return -1;
                    if (a.role !== "MAIN" && b.role === "MAIN") return 1;
                    return a.name.full.localeCompare(b.name.full);
                }
            );
        }

        setLoadingStates((prev) => ({ ...prev, characters: false }));
        const filteredRelations = animeData.relations?.filter(
            (relation: any) => relation.relationType !== "ADAPTATION"
        );
        setRelation(filteredRelations?.slice(0, 10) || []);
        setLoadingStates((prev) => ({ ...prev, relations: false }));

        const mappedRecommendations =
            animeData.recommendations?.map((rec: any) => ({
                id: rec.id,
                image: rec.image,
                rating: rec.rating,
                title: rec.title.english || rec.title.romaji,
            })) || [];
        const filteredRecommendations = mappedRecommendations.filter(
            (rec: any) => rec.id !== undefined
        );
        setRecommendations(filteredRecommendations);
        setLoadingStates((prev) => ({ ...prev, recommendations: false }));
        saveDetails(response.data.id, response.data.title.english, response.data.image);
    };
    const fetchEpisodeData = async (id: number) => {
        try {
            const responsePahe = await axios.get(`https://yonkohubproxyserver-production-70eb.up.railway.app/api/episodes/${id}`)
            const responseZoro = await axios.get(`https://yonkohubproxyserver-production-70eb.up.railway.app/api/episodes/${id}?provider=zoro`)
            const zoro = responseZoro.data;

            if (responsePahe.data.length > 0) {
                const mappedEpisodes = responsePahe.data.map((episode: any, index: number) => ({
                    paheId0: episode.id.split("/")[0],
                    paheId1: episode.id.split("/")[1],
                    zoroId: zoro[index]?.id || null,
                    image: episode.image,
                    epNo: episode.number,
                    title: zoro[index]?.title || episode.title,
                }));
                setEpisodeData(mappedEpisodes);

            } else {
                const mappedEpisodes = zoro.map((episode: any) => ({
                    paheId0: null,
                    paheId1: null,
                    zoroId: episode.id,
                    image: episode.image,
                    epNo: episode.number,
                    title: episode.title,
                }));
                setEpisodeData(mappedEpisodes);

            }
            setLoadingStates(prev => ({ ...prev, episodes: false }));
        } catch (error: any) {
            console.error("Fatal error fetching episode data:", error.message);
            setEpisodeData([]);
            setLoadingStates(prev => ({ ...prev, episodes: false }));
        }
    };

    // Add fade-in animation when content loads
    useEffect(() => {
        if (!loadingStates.mainContent) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [loadingStates.mainContent]);

    const checkInWatchlist = async (animeId: string) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            try {

                if (!animeId) {
                    console.error("No anime id available for watchlist check");
                    return;
                }

                const response = await axios.post(
                    "https://mugiwarahubbackend-production.up.railway.app/api/watchlist/check",
                    {
                        AnimeId: animeId,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (response.data.response === true) {
                    setInWatchlist(true);
                } else {
                    setInWatchlist(false);
                }
            } catch (error: any) {
                console.error(
                    "Error checking watchlist:",
                    error.response?.data?.message || error.message
                );
            }
        }
    }
    const addToWatchlist = async () => {
        setWatchlistLoading(true);
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
            setWatchlistLoading(false);
            setShowLoginModal(true);
            return;
        } 
        
        if (!anime?.id) {
            console.error("No anime id available");
            setWatchlistLoading(false);
            return;
        }
        
        try {
            const response = await axios.post(
                "https://mugiwarahubbackend-production.up.railway.app/api/watchlist/add",
                {
                    AnimeId: parseInt(anime.id),
                    English_Title: anime?.title.english,
                    Japanese_Title: anime?.title.romaji,
                    Image_url: anime?.image,
                    synopsis: anime?.description,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            
            if (response.data.message === "Anime added to watchlist") {
                setInWatchlist(true);
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Added to watchlist', ToastAndroid.SHORT);
                }
            }
        } catch (error: any) {
            console.error(
                "Error adding to watchlist:",
                error.response?.data?.message || error.message
            );
            if (Platform.OS === 'android') {
                ToastAndroid.show('Failed to add to watchlist', ToastAndroid.SHORT);
            }
        } finally {
            setWatchlistLoading(false);
        }
    }; const removeFromWatchlist = async () => {
        setWatchlistLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            console.error("User is not authenticated");
            router.push('/login');
            setWatchlistLoading(false);
            return;
        } else if (!anime?.id) {
            console.error("No anime id available");
            return;
        } else {
            try {
                const response = await axios.delete(
                    "https://mugiwarahubbackend-production.up.railway.app/api/watchlist/delete",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        data: {
                            AnimeId: parseInt(anime.id),
                        },
                    }
                ); if (response.data.message === "Anime removed from watchlist") {
                    setInWatchlist(false);
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Removed from watchlist', ToastAndroid.SHORT);
                    }
                }
            } catch (error: any) {
                console.error(
                    "Error removing from watchlist:",
                    error.response?.data?.message || error.message
                );
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Failed to remove from watchlist', ToastAndroid.SHORT);
                }
            } finally {
                setWatchlistLoading(false);
            }
        }
    }; const toggleWatchlist = async () => {
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
            setShowLoginModal(true);
            return;
        }

        if (inWatchlist) {
            removeFromWatchlist();
        } else {
            addToWatchlist();
        }
    };


    const shareAnime = () => {
        console.log("Share button pressed");
    };

    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating / 2);

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <FontAwesome key={i} name="star" size={20} color="#FFD700" />
                );
            } else {
                stars.push(
                    <FontAwesome key={i} name="star-o" size={20} color="#FFD700" />
                );
            }
        }

        return stars;
    };

    const getEpisodeGroups = () => {
        if (!episodeData || episodeData.length <= 24) {
            return [{ label: "All Episodes", value: 0 }];
        }

        const groups = [];
        for (let i = 0; i < Math.ceil(episodeData.length / 24); i++) {
            const startEp = i * 24 + 1;
            const endEp = Math.min((i + 1) * 24, episodeData.length);
            groups.push({
                label: `Episodes ${startEp}-${endEp}`,
                value: i
            });
        }
        return groups;
    };

    const displayedEpisodes = useMemo(() => {
        if (!episodeData || episodeData.length <= 24) {
            return episodeData;
        }
        const startIdx = selectedEpisodeRange * 24;
        const endIdx = Math.min((selectedEpisodeRange + 1) * 24, episodeData.length);
        return episodeData.slice(startIdx, endIdx);
    }, [episodeData, selectedEpisodeRange]); if (loadingStates.mainContent) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
                <StatusBar barStyle="light-content" />

                {/* Skeleton Header */}
                <View style={{ height: 250, width: '100%' }}>
                    <SkeletonPlaceholder width="100%" height="100%" style={{ borderRadius: 0 }} />
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 120,
                        paddingHorizontal: 16,
                        paddingTop: Platform.OS === 'ios' ? 50 : 30,
                    }}>
                        {/* Back button skeleton */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <SkeletonPlaceholder width={40} height={40} style={{ borderRadius: 20 }} />
                        </View>
                    </View>
                </View>

                {/* Skeleton Content */}
                <View style={{ padding: 16 }}>
                    {/* Title skeleton */}
                    <SkeletonPlaceholder width={screenWidth * 0.8} height={28} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width={screenWidth * 0.6} height={20} style={{ marginBottom: 16 }} />

                    {/* Info row skeleton */}
                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                        <SkeletonPlaceholder width={80} height={24} style={{ marginRight: 12 }} />
                        <SkeletonPlaceholder width={80} height={24} style={{ marginRight: 12 }} />
                        <SkeletonPlaceholder width={80} height={24} />
                    </View>

                    {/* Synopsis skeleton */}
                    <SkeletonPlaceholder width="100%" height={16} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="100%" height={16} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="90%" height={16} style={{ marginBottom: 8 }} />
                    <SkeletonPlaceholder width="95%" height={16} style={{ marginBottom: 16 }} />

                    {/* Tabs skeleton */}
                    <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'space-around' }}>
                        <SkeletonPlaceholder width={100} height={40} />
                        <SkeletonPlaceholder width={100} height={40} />
                        <SkeletonPlaceholder width={100} height={40} />
                    </View>

                    {/* Episodes grid skeleton */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {[1, 2, 3, 4, 5, 6].map(item => (
                            <SkeletonPlaceholder
                                key={item}
                                width={(screenWidth - 48) / 2}
                                height={100}
                                style={{ marginBottom: 16, borderRadius: 8 }}
                            />
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (!anime) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={60} color="#9B81E5" />
                <Text style={styles.errorText}>Failed to load anime</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }


    return (
        <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Floating header with blur effect */}
            <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
                <BlurView intensity={80} tint="dark" style={styles.blurView}>
                    <TouchableOpacity
                        style={styles.headerBackButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {anime?.title.english || anime?.title.romaji}
                    </Text>                    <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={shareAnime}
                    >
                        <Ionicons name="share-outline" size={24} color="white" />
                    </TouchableOpacity>
                </BlurView>
            </Animated.View>

            <Animated.ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Hero Image with parallax effect */}
                <View style={styles.heroContainer}>
                    <Animated.Image
                        source={{ uri: anime?.image }}
                        style={[
                            styles.bannerImage,
                            { transform: [{ translateY: imageTranslateY }] }
                        ]}
                        resizeMode="cover"
                    />

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']}
                        style={styles.gradient}
                    >
                        <Animated.View style={{ opacity: fadeAnim }}>
                            <Text style={styles.title}>
                                {anime?.title.english || anime?.title.romaji}
                            </Text>

                            <Text style={styles.metaInfo}>
                                {`${anime?.releaseDate} • ${anime?.totalEpisodes || anime?.episodes?.sub || '?'} Episodes • ${anime?.genres?.slice(0, 4).join(', ')}`}
                            </Text>

                            {/* Star rating */}
                            <View style={styles.ratingContainer}>
                                <View style={styles.starsContainer}>
                                    {anime && renderStars(anime.rating)}
                                </View>
                                <Text style={styles.ratingText}>
                                    {anime && (anime.rating / 10).toFixed(1)} ({anime?.rating / 10})
                                </Text>
                            </View>

                            {/* Action buttons */}                            <View style={styles.actionContainer}>                                {inWatchlist ? (<TouchableOpacity
                                style={styles.removeButton}
                                onPress={removeFromWatchlist}
                                disabled={watchlistLoading}
                            >
                                {watchlistLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons
                                        name="close-circle"
                                        size={24}
                                        color="#FFFFFF"
                                    />
                                )}
                                <Text style={styles.removeButtonText}>
                                    {watchlistLoading ? "REMOVING..." : "REMOVE FROM WATCHLIST"}
                                </Text>
                            </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={addToWatchlist}
                                    disabled={watchlistLoading}
                                >
                                    {watchlistLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Ionicons
                                            name="bookmark-outline"
                                            size={24}
                                            color="#FFFFFF"
                                        />
                                    )}
                                    <Text style={styles.addButtonText}>
                                        {watchlistLoading ? "ADDING..." : "ADD TO WATCHLIST"}
                                    </Text>
                                </TouchableOpacity>
                            )}

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={shareAnime}
                                >
                                    <Ionicons
                                        name="share-social"
                                        size={28}
                                        color="#9B81E5"
                                    />
                                    <Text style={styles.actionButtonText}>SHARE</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </LinearGradient>

                    {/* Close button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Synopsis */}
                <Animated.View
                    style={[styles.synopsisContainer, { opacity: fadeAnim }]}
                >
                    <Text
                        style={styles.synopsisText}
                        numberOfLines={expandedSynopsis ? undefined : 3}
                    >
                        {anime?.description?.replace(/<br\s*\/?>/g, ' ')
                            .replace(/<[^>]*>/g, '')}
                    </Text>
                    <TouchableOpacity
                        style={styles.readMoreButton}
                        onPress={() => setExpandedSynopsis(!expandedSynopsis)}
                    >
                        <Text style={styles.readMoreText}>
                            {expandedSynopsis ? "Show less" : "Read more"}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Info Pills */}
                <Animated.View style={[styles.infoPillsContainer, { opacity: fadeAnim }]}>
                    <View style={styles.infoPill}>
                        <Text style={styles.infoPillLabel}>Status</Text>
                        <Text style={styles.infoPillValue}>{anime?.status || "Unknown"}</Text>
                    </View>

                    <View style={styles.infoPill}>
                        <Text style={styles.infoPillLabel}>Episodes</Text>
                        <Text style={styles.infoPillValue}>{anime?.totalEpisodes || anime?.episodes?.sub || "?"}</Text>
                    </View>

                    <View style={styles.infoPill}>
                        <Text style={styles.infoPillLabel}>Duration</Text>
                        <Text style={styles.infoPillValue}>{anime?.duration || "??"} min</Text>
                    </View>
                </Animated.View>

                {/* Tab navigation - 3 TABS NOW */}
                <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'episodes' && styles.tabButtonActive
                        ]}
                        onPress={() => setSelectedTab('episodes')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === 'episodes' && styles.tabTextActive
                            ]}
                        >
                            EPISODES
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'characters' && styles.tabButtonActive
                        ]}
                        onPress={() => setSelectedTab('characters')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === 'characters' && styles.tabTextActive
                            ]}
                        >
                            CHARACTERS
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'related' && styles.tabButtonActive
                        ]}
                        onPress={() => setSelectedTab('related')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === 'related' && styles.tabTextActive
                            ]}
                        >
                            RELATED
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Tab content */}
                <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
                    {selectedTab === 'episodes' ? (
                        <View>
                            {loadingStates.episodes ? (
                                <ActivityIndicator size="large" color="#9B81E5" />
                            ) : (
                                <View>
                                    {/* Episode Group Selector */}
                                    {episodeData && episodeData.length > 24 && (
                                        <View style={styles.episodeGroupContainer}>
                                            <Text style={styles.episodeGroupLabel}>Episode Range:</Text>
                                            <Dropdown
                                                style={styles.episodeGroupDropdown}
                                                placeholderStyle={styles.episodeGroupPlaceholder}
                                                selectedTextStyle={styles.episodeGroupSelectedText}
                                                data={getEpisodeGroups()}
                                                maxHeight={300}
                                                labelField="label"
                                                valueField="value"
                                                placeholder="Select episode range"
                                                value={selectedEpisodeRange}
                                                onChange={item => {
                                                    setSelectedEpisodeRange(item.value);
                                                }}
                                                renderItem={item => (
                                                    <View style={styles.dropdownItem}>
                                                        <Text style={styles.dropdownItemText}>{item.label}</Text>
                                                    </View>
                                                )}
                                            />
                                        </View>
                                    )}

                                    {/* Episode List */}
                                    <FlatList
                                        data={displayedEpisodes}
                                        keyExtractor={(item) => item.zoroId || `${item.epNo}`}
                                        showsVerticalScrollIndicator={false}
                                        scrollEnabled={false}
                                        numColumns={2}
                                        columnWrapperStyle={styles.episodeRow}
                                        renderItem={({ item, index }) => (
                                            <TouchableOpacity
                                                style={styles.episodeCard}
                                                onPress={() => router.push(`/watch/${item.paheId0}+${item.paheId1}+${item.zoroId}+${item.epNo}+${animeId}+${anime.title.english}`)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.episodeImageContainer}>
                                                    <Image
                                                        source={{ uri: item.image }}
                                                        style={styles.episodeImage}
                                                        resizeMode="cover"
                                                    />
                                                    <LinearGradient
                                                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                                                        style={styles.episodeGradient}
                                                    />
                                                    <View style={styles.episodeNumberBadge}>
                                                        <Text style={styles.episodeNumberText}>{item.epNo}</Text>
                                                    </View>

                                                    <View style={styles.episodePlayButton}>
                                                        <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                                                    </View>
                                                </View>

                                                <Text style={styles.episodeTitle} numberOfLines={2}>
                                                    {item.title || `Episode ${item.epNo}`}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <Text style={styles.noEpisodesText}>
                                                No episodes available
                                            </Text>
                                        }
                                    />
                                </View>
                            )}
                        </View>
                    ) : selectedTab === 'characters' ? (
                        <View style={styles.charactersContainer}>
                            {loadingStates.characters ? (
                                <ActivityIndicator size="large" color="#9B81E5" />
                            ) : anime?.characters && anime.characters.length > 0 ? (
                                anime.characters.map((character, index) => (
                                    <View key={character.id || index} style={styles.characterCard}>
                                        <Image
                                            source={{ uri: character.image }}
                                            style={styles.characterImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.characterInfo}>
                                            <Text style={styles.characterName}>
                                                {character.name.full}
                                            </Text>
                                            <View style={[
                                                styles.roleBadge,
                                                character.role === "MAIN" && styles.roleBadgeMain
                                            ]}>
                                                <Text style={styles.roleText}>
                                                    {character.role}
                                                </Text>
                                            </View>

                                            {character.voiceActors && character.voiceActors.length > 0 && (
                                                <View style={styles.voiceActorsContainer}>
                                                    <Text style={styles.voiceActorHeading}>Voice Actor</Text>
                                                    <View style={styles.voiceActorRow}>
                                                        {character.voiceActors[0].image && (
                                                            <Image
                                                                source={{ uri: character.voiceActors[0].image }}
                                                                style={styles.voiceActorImage}
                                                            />
                                                        )}
                                                        <View style={styles.voiceActorInfo}>
                                                            <Text style={styles.voiceActorName}>
                                                                {character.voiceActors[0].name.full}
                                                            </Text>
                                                            <Text style={styles.voiceActorLanguage}>
                                                                {character.voiceActors[0].language}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noContentText}>
                                    No character information available
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.relatedContainer}>
                            {/* Related Section */}
                            {loadingStates.relations ? (
                                <ActivityIndicator size="large" color="#9B81E5" />
                            ) : relation.length > 0 ? (
                                <>
                                    <Text style={styles.sectionTitle}>Related Anime</Text>
                                    <View style={styles.relatedList}>
                                        {relation.map((item, index) => (
                                            <TouchableOpacity
                                                key={item.id || index}
                                                style={styles.relatedCard}
                                                onPress={() => router.push(`/anime-details/${item.id}`)}
                                            >
                                                <Image
                                                    source={{ uri: item.image }}
                                                    style={styles.relatedImage}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.relatedInfo}>
                                                    <Text style={styles.relatedTitle} numberOfLines={2}>
                                                        {item.title?.english || item.title?.romaji}
                                                    </Text>
                                                    <Text style={styles.relationType}>
                                                        {item.relationType}
                                                    </Text>
                                                    {item.status && (
                                                        <View style={styles.statusBadge}>
                                                            <Text style={styles.statusText}>
                                                                {item.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noContentText}>No related anime found</Text>
                            )}

                            {/* Recommendations Section */}
                            {loadingStates.recommendations ? (
                                <ActivityIndicator size="large" color="#9B81E5" />
                            ) : recommendations.length > 0 ? (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recommendations</Text>
                                    <FlatList
                                        data={recommendations}
                                        keyExtractor={(item) => item.id.toString()}
                                        numColumns={3}
                                        scrollEnabled={false}
                                        columnWrapperStyle={styles.recommendationsRow}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.recommendationCard}
                                                onPress={() => router.push(`/anime-details/${item.id}`)}
                                                activeOpacity={0.7}
                                            >
                                                <Image
                                                    source={{ uri: item.image }}
                                                    style={styles.recommendationImage}
                                                    resizeMode="cover"
                                                />
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                                                    style={styles.recommendationGradient}
                                                >
                                                    {item.rating && (
                                                        <View style={styles.recommendationRating}>
                                                            <FontAwesome name="star" size={10} color="#FFD700" />
                                                            <Text style={styles.recommendationRatingText}>
                                                                {(item.rating / 10).toFixed(1)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </LinearGradient>
                                                <Text style={styles.recommendationTitle} numberOfLines={2}>
                                                    {item.title}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <Text style={styles.noRecommendationsText}>
                                                No recommendations available
                                            </Text>
                                        }
                                    />
                                </>
                            ) : null}
                        </View>
                    )}
                </Animated.View>
            </Animated.ScrollView>

            {/* Login Prompt Modal */}
            <Modal
                visible={showLoginModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLoginModal(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowLoginModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Ionicons name="log-in-outline" size={50} color="#9B81E5" style={styles.modalIcon} />
                            <Text style={styles.modalTitle}>Login Required</Text>
                            <Text style={styles.modalDescription}>
                                You need to be logged in to add anime to your watchlist
                            </Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowLoginModal(false)}
                                >
                                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.modalLoginButton}
                                    onPress={() => {
                                        setShowLoginModal(false);
                                        router.push('/login');
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#9B81E5', '#6A4BCC']}
                                        style={styles.loginButtonGradient}
                                    >
                                        <Text style={styles.modalLoginButtonText}>Log In</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        padding: 20,
    },
    errorText: {
        color: 'white',
        fontSize: 18,
        marginTop: 12,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#9B81E5',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    blurView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerActionButton: {
        padding: 8,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 15,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    heroContainer: {
        height: 550,
        position: 'relative',
        overflow: 'hidden',
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
        height: '60%',
        justifyContent: 'flex-end',
        padding: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5,
    },
    metaInfo: {
        color: '#DDDDDD',
        fontSize: 14,
        marginBottom: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 10,
    },
    ratingText: {
        color: 'white',
        fontSize: 14,
    },
    actionContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 10,
        marginBottom: 20,
        gap: 40,
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    }, actionButtonText: {
        color: '#9B81E5',
        marginTop: 5,
        fontSize: 12,
        fontWeight: 'bold',
    }, removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF5252',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    }, removeButtonText: {
        color: '#FFFFFF',
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 'bold',
        flexShrink: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9B81E5',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        shadowColor: '#9B81E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    addButtonText: {
        color: '#FFFFFF',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
    },
    synopsisContainer: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 0,
    },
    synopsisText: {
        color: 'white',
        fontSize: 15,
        lineHeight: 22,
    },
    readMoreButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    readMoreText: {
        color: '#9B81E5',
        fontSize: 14,
        fontWeight: '600',
    },
    infoPillsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    infoPill: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        minWidth: 100,
    },
    infoPillLabel: {
        color: '#999',
        fontSize: 12,
    },
    infoPillValue: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        marginTop: 12,
    },
    tabButton: {
        paddingVertical: 15,
        paddingHorizontal: 16,
        position: 'relative',
    },
    tabButtonActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#9B81E5',
    },
    tabText: {
        color: '#888',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    tabTextActive: {
        color: '#9B81E5',
    },
    tabContent: {
        padding: 16,
        paddingBottom: 80, // Make room for the watch button
        minHeight: 300,
    },
    episodeRow: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    episodeCard: {
        width: '48%',
        marginBottom: 12,
    },
    episodeImageContainer: {
        height: 120,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    episodeImage: {
        width: '100%',
        height: '100%',
    },
    episodeGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
    },
    episodeNumberBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#9B81E5',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    episodeNumberText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    episodePlayButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [
            { translateX: -20 },
            { translateY: -20 },
        ],
        opacity: 0.9,
    },
    episodeTitle: {
        color: 'white',
        fontSize: 14,
        marginTop: 8,
        fontWeight: '500',
    },
    noEpisodesText: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    recommendationsRow: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    recommendationsContainer: {
        flexWrap: 'wrap',
    },
    recommendationCard: {
        width: '31%',
        marginBottom: 16,
    },
    recommendationImage: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 6,
    },
    recommendationGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
    },
    recommendationRating: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 3,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    recommendationRatingText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    recommendationTitle: {
        color: 'white',
        fontSize: 13,
        marginTop: 6,
    },
    noRecommendationsText: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    watchButtonContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        backgroundColor: 'rgba(0,0,0,0.95)',
        borderTopWidth: 1,
        borderTopColor: '#333',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    watchButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#9B81E5',
        paddingVertical: 14,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        elevation: 4,
        shadowColor: '#9B81E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    watchButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    bookmarkButton: {
        width: 50,
        height: 50,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#444',
    },
    bookmarkButtonActive: {
        backgroundColor: '#9B81E5',
        borderColor: '#9B81E5',
    },

    // Character styles
    charactersContainer: {
        paddingVertical: 12,
    },
    characterCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30,30,30,0.5)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    characterImage: {
        width: 100,
        height: 150,
    },
    characterInfo: {
        flex: 1,
        padding: 12,
    },
    characterName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#555',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 10,
    },
    roleBadgeMain: {
        backgroundColor: '#9B81E5',
    },
    roleText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    voiceActorsContainer: {
        marginTop: 10,
    },
    voiceActorHeading: {
        color: '#BBB',
        fontSize: 14,
        marginBottom: 6,
    },
    voiceActorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    voiceActorImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    voiceActorInfo: {
        flex: 1,
    },
    voiceActorName: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    voiceActorLanguage: {
        color: '#AAA',
        fontSize: 13,
    },

    // Related anime styles
    relatedContainer: {
        paddingVertical: 12,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    relatedList: {
        gap: 12,
    },
    relatedCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30,30,30,0.5)',
        borderRadius: 10,
        overflow: 'hidden',
        height: 100,
    },
    relatedImage: {
        width: 70,
        height: '100%',
    },
    relatedInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    relatedTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    relationType: {
        color: '#BBB',
        fontSize: 14,
        marginBottom: 6,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
    },
    noContentText: {
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
    },
    episodeGroupContainer: {
        marginBottom: 20,
        backgroundColor: 'rgba(30, 30, 30, 0.6)',
        borderRadius: 10,
        padding: 16,
    },
    episodeGroupLabel: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    episodeGroupDropdown: {
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderColor: '#444',
        borderWidth: 1,
    },
    episodeGroupPlaceholder: {
        color: '#CCC',
        fontSize: 16,
    },
    episodeGroupSelectedText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    dropdownItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
    },
    dropdownItemText: {
        color: 'white',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    modalContent: {
        alignItems: 'center',
        padding: 24,
    },
    modalIcon: {
        marginBottom: 16,
    },
    modalTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalDescription: {
        color: '#CCC',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    modalCancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        width: '45%',
        alignItems: 'center',
    },
    modalCancelButtonText: {
        color: '#CCC',
        fontSize: 16,
        fontWeight: '500',
    },
    modalLoginButton: {
        width: '45%',
        borderRadius: 8,
        overflow: 'hidden',
    },
    loginButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    modalLoginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});