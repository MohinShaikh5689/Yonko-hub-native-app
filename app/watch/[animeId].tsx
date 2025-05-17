import CommentSection from '@/components/commentComponent';
import { ThemedView } from '@/components/ThemedView';
import VideoPlayer from '@/components/VideoPlayer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

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

interface EpisodeInfo {
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  number?: number;
}

interface zoroEp {
  headers?: {
    Referer: string;
  };
  sources: {
    url: string;
    isM3U8: boolean;
    type: string;
  }[];
  subtitles: [{
    url: string;
    lang: string;
  }];
}

export default function Watch() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPahe, setIsPahe] = useState(false);
  const [episodeData, setEpisodeData] = useState<Episode | zoroEp | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [quality, setQuality] = useState<string>('auto');
  const [isDub, setIsDub] = useState(false);
  const [episodeInfo, setEpisodeInfo] = useState<EpisodeInfo>({
    title: 'Loading episode...'
  });
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = new Animated.Value(1);
  const [episodeList, setEpisodeList] = useState<EpisodeInfo[]>([]);

  // Parameter parsing with URL encoding fix
  const { animeId } = useLocalSearchParams<{ animeId: string }>();
  const animeI = decodeURIComponent(animeId as string);
  const parts = animeI?.split('+');
  const paheId0 = parts[0] || '';

  const paheId1 = parts[1] || '';

  const paheId = `${paheId0}/${paheId1}`;
  const zoroId = parts[2];
  const animeID = parts[4];
  const epNo = parseInt(parts[3] || '1', 10);
  const animeName = parts[5] ? decodeURIComponent(parts[5]) : 'Anime Episode';

  // Set up episode info
  useEffect(() => {
    setEpisodeInfo({
      title: `${animeName} - Episode ${epNo}`,
      duration: "24 min",
    });
  }, [animeName, epNo]);

  const checkIsLast = (episode: any[], currentIndex: number) => {
    const lastEpisode = episode[episode.length - 1];
    return currentIndex === lastEpisode.number;

  }

  const saveContinueWatching = async (episode: any[], ePNo: number) => {

    const token = await AsyncStorage.getItem('token');
    if (token) {

      const animeData = await AsyncStorage.getItem('AnimeDetails');
      if (animeData) {
        const parsedData = JSON.parse(animeData);
        const currIndex = parsedData.findIndex((item: any) => item.id === animeID);
        const isLast = checkIsLast(episode, epNo);
        if (isLast) {
          try {
            const response = await axios.delete(`https://mugiwarahubbackend-production.up.railway.app/api/continueWatching/delete/${parsedData[currIndex].id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              }
            });
          } catch (error: any) {
            console.error("Error deleting continue watching:", error);
          }
        } else {
          try {
            await axios.post('https://mugiwarahubbackend-production.up.railway.app/api/continueWatching/add', {
              AnimeId: parsedData[currIndex].id,
              episodeId: animeI,
              title: parsedData[currIndex].title,
              image: parsedData[currIndex].image,
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
              }
            });
          } catch (error: any) {
            console.error("Error creating continue watching:", error);
          }
        }


        parsedData[currIndex].episodeId = animeI;
      }
    }
  }

  // Fetch episode data
  const fetchPahe = async () => {
    try {
      setLoading(true);
      const url = `https://yonkohubproxyserver-production-70eb.up.railway.app/api/watch/${paheId}`;

      const response = await axios.get(url);

      if (response.data && response.data.sources && response.data.sources.length > 0) {
        setIsPahe(true);
        setEpisodeData(response.data);

        // Select default source
        const sources = response.data.sources;
        const defaultSource = getPreferredSource(sources);
        setSelectedSource(defaultSource);
        setQuality(defaultSource.quality);
        setIsDub(defaultSource.isDub || false);

        setLoading(false);
        return response.data;
      } else {
        return fetchZoro();
      }
    } catch (error) {
      console.error("Error fetching Pahe data:", error);
      return fetchZoro();
    }
  };

  const fetchZoro = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`https://yonkohubproxyserver-production-70eb.up.railway.app/api/zoro/${zoroId}`);

      if (response.data && response.data.sources && response.data.sources.length > 0) {
        setIsPahe(false);
        setEpisodeData(response.data);

        // Select default source
        const sources = response.data.sources;
        const defaultSource = getPreferredSource(sources);
        setSelectedSource(defaultSource);
        setQuality(defaultSource.quality);
        setIsDub(defaultSource.isDub || false);

        setLoading(false);
        return response.data;
      } else {
        setError("No streaming data found for this episode");
        setLoading(false);
        return null;
      }
    } catch (error) {
      console.error("Error fetching Zoro data:", error);
      setError("Failed to load streaming data");
      setLoading(false);
      return null;
    }
  };

  // Helper function to get preferred source
  const getPreferredSource = (sources: Source[]): Source => {
    // First try to find a high quality source
    const highQualitySources = sources.filter(s =>
      (s.quality === '1080p' || s.quality === '720p') && !s.isDub
    );

    if (highQualitySources.length > 0) {
      return highQualitySources[0];
    }

    // Fallback to any non-dub source
    const nonDubSources = sources.filter(s => !s.isDub);
    if (nonDubSources.length > 0) {
      return nonDubSources[0];
    }

    // Last resort: return first source
    return sources[0];
  };

  // Change quality
  const changeQuality = (newQuality: string) => {
    if (!episodeData) return;

    const matchingSources = episodeData.sources.filter(
      s => 'quality' in s && s.quality === newQuality && s.isDub === isDub
    );

    if (matchingSources.length > 0) {
      const validSource = matchingSources.find(
        (source): source is Source => 'quality' in source && 'isDub' in source
      );
      if (validSource) {
        setSelectedSource(validSource);
      }
      setQuality(newQuality);
      setShowQualityModal(false);
    }
  };

  // Toggle dub/sub
  const toggleDub = () => {
    if (!episodeData) return;

    const newIsDub = !isDub;
    const matchingSources = episodeData.sources.filter(
      s => 'isDub' in s && s.isDub === newIsDub
    );

    if (matchingSources.length > 0) {
      // Try to match current quality first
      const sameQualitySource = matchingSources.find(
        (s): s is Source => 'quality' in s && s.quality === quality
      );

      if (sameQualitySource) {
        setSelectedSource(sameQualitySource);
      } else {
        const validSource = matchingSources[0] as Source;
        setSelectedSource(validSource);
        if ('quality' in matchingSources[0]) {
          setQuality(matchingSources[0].quality);
        }
      }

      setIsDub(newIsDub);
    }
  };

  // Navigate to previous/next episode


  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (showControls && !loading && !error) {
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();

      timeout = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start(() => setShowControls(false));
      }, 3000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls, loading, error]);

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
          number: episode.number,
          title: zoro[index]?.title || episode.title,
        }));
        setEpisodeList(mappedEpisodes);
        saveContinueWatching(mappedEpisodes, epNo)
      } else {
        const mappedEpisodes = zoro.map((episode: any) => ({
          paheId0: null,
          paheId1: null,
          zoroId: episode.id,
          image: episode.image,
          number: episode.number,
          title: episode.title,
        }));
        setEpisodeList(mappedEpisodes);

      }

    } catch (error: any) {
      console.error("Fatal error fetching episode data:", error.message);
      setEpisodeList([]);

    }
  };

  const nextEpisode = () => {

    if (epNo < (episodeList[episodeList.length - 1]?.number ?? 0)) {
      const nextEp = epNo + 1;
      const nextEpisode = episodeList.find(ep => ep.number === nextEp);
      if (nextEpisode) {
        router.push(`/watch/${paheId0}+${paheId1}+${zoroId}+${epNo + 1}+${animeID}+${animeName}`);
      }
    }
  }

  const previousEpisode = () => {
    if (epNo > 1) {
      const prevEp = epNo - 1;
      const prevEpisode = episodeList.find(ep => ep.number === prevEp);
      if (prevEpisode) {
        router.push(`/watch/${paheId0}+${paheId1}+${zoroId}+${epNo - 1}+${animeID}+${animeName}`);
      }
    }
  }



  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    Platform.OS === 'android' && StatusBar.setBackgroundColor('#000000');

    fetchPahe();
    fetchEpisodeData(Number(animeID));

    return () => {
      StatusBar.setBarStyle('default');
      Platform.OS === 'android' && StatusBar.setBackgroundColor('transparent');
    };
  }, []);

  // Available qualities
  const getAvailableQualities = () => {
    if (!episodeData) return [];

    const qualities = Array.from(
      new Set(
        episodeData.sources
          .filter((source): source is Source => 'isDub' in source && source.isDub === isDub)
          .map(source => ('quality' in source ? source.quality : null))
          .filter((quality): quality is string => quality !== null)
      )
    );

    return qualities;
  };


  return (
    <ThemedView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.videoSection}>
        {/* Back button positioned above video */}
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.videoContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9B81E5" />
              <Text style={styles.loadingText}>Loading episode...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={60} color="#9B81E5" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchPahe}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : selectedSource ? (
            <VideoPlayer
              source={selectedSource}
              referer={episodeData?.headers?.Referer || ''}
              subtitles={!isPahe && episodeData && 'subtitles' in episodeData ? episodeData.subtitles : undefined}
            />
          ) : null}
        </View>
      </View>

      {/* Video controls with next/previous buttons */}
      {!loading && !error && selectedSource && (
        <View style={styles.videoControlsExternal}>
          <View style={styles.episodeNavControls}>
            <TouchableOpacity
              style={[styles.navButton, episodeList[0]?.number !== undefined && epNo <= episodeList[0].number ? styles.disabledNavButton : {}]}
              onPress={previousEpisode}
              disabled={episodeList[0]?.number !== undefined && epNo <= episodeList[0].number}
            >
              <Ionicons
                name="play-skip-back"
                size={20}
                color={episodeList[0]?.number !== undefined && epNo <= episodeList[0].number ? "#666" : "white"}
              />
              <Text
                style={[styles.navButtonText, episodeList[0]?.number !== undefined && epNo <= episodeList[0].number ? { color: "#666" } : {}]}
              >
                Prev
              </Text>
            </TouchableOpacity>

            <Text style={styles.episodeCounter}>EP {epNo}</Text>

            <TouchableOpacity
              style={[styles.navButton, epNo >= (episodeList[episodeList.length - 1]?.number || 0) ? styles.disabledNavButton : {}]}
              onPress={nextEpisode}
              disabled={epNo >= (episodeList[episodeList.length - 1]?.number || 0)}
            >
              <Text
                style={[styles.navButtonText, epNo >= (episodeList[episodeList.length - 1]?.number || 0) ? { color: "#666" } : {}]}
              >
                Next
              </Text>
              <Ionicons
                name="play-skip-forward"
                size={20}
                color={epNo >= (episodeList[episodeList.length - 1]?.number || 0) ? "#666" : "white"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.controlsRow}>
            <Text style={styles.episodeTitle} numberOfLines={1}>
              {episodeInfo.title}
            </Text>

            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setShowQualityModal(true)}
              >
                <Ionicons name="settings-outline" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.qualityText}>{quality}</Text>
              </TouchableOpacity>

              {episodeData?.sources.some((s): s is Source => 'isDub' in s && s.isDub) && (
                <TouchableOpacity
                  style={[styles.controlButton, isDub ? styles.activeButton : {}]}
                  onPress={toggleDub}
                >
                  <Text style={styles.buttonText}>
                    {isDub ? 'DUB' : 'SUB'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Episode Information */}
      <ScrollView style={styles.infoContainer}>
        <View style={styles.episodeHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.mainTitle} numberOfLines={2}>
              {animeName}
            </Text>
            <View style={styles.episodeBadge}>
              <Text style={styles.episodeBadgeText}>EP {epNo}</Text>
            </View>
          </View>

          <Text style={styles.episodeSubtitle}>
            {episodeInfo.title.replace(`${animeName} - `, '')}
          </Text>

          <View style={styles.metaInfo}>
            {episodeInfo.duration && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.metaText}>{episodeInfo.duration}</Text>
              </View>
            )}

            <View style={styles.metaItem}>
              <Ionicons name="server-outline" size={14} color="#999" />
              <Text style={styles.metaText}>{isPahe ? 'Server 1' : 'Server 2'}</Text>
            </View>
          </View>
        </View>

        {/* Comment Section */}
        <CommentSection animeId={epNo + animeID} />
      </ScrollView>

      {/* Quality Selection Modal */}
      <Modal
        visible={showQualityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowQualityModal(false)}
        >
          <BlurView intensity={30} style={StyleSheet.absoluteFill} />

          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Quality</Text>
              <TouchableOpacity onPress={() => setShowQualityModal(false)}>
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.qualityOptions}>
              {getAvailableQualities().map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.qualityOption,
                    q === quality ? styles.selectedQuality : {}
                  ]}
                  onPress={() => changeQuality(q)}
                >
                  <Text style={[
                    styles.qualityOptionText,
                    q === quality ? styles.selectedQualityText : {}
                  ]}>
                    {q}
                  </Text>

                  {q === quality && (
                    <Ionicons name="checkmark-circle" size={20} color="#9B81E5" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

// Replace the existing StyleSheet with this cleaned version

const styles = StyleSheet.create({
  // Container and layout
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },

  // Video section
  videoSection: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 5,
  },

  // Loading states
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },

  // Error states
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
  }, retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#9B81E5',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // Video controls
  videoControlsExternal: {
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  episodeNavControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  episodeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  controlButtons: {
    flexDirection: 'row',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginLeft: 8,
  }, activeButton: {
    backgroundColor: '#9B81E5',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  qualityText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },

  // Navigation controls
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabledNavButton: {
    backgroundColor: '#222',
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 5,
  },
  episodeCounter: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Episode header
  episodeHeader: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mainTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  }, episodeBadge: {
    backgroundColor: '#9B81E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  episodeBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  episodeSubtitle: {
    color: '#CCC',
    fontSize: 16,
    marginBottom: 12,
  },

  // Metadata
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  metaText: {
    color: '#999',
    marginLeft: 4,
    fontSize: 13,
  },

  // Episode description (kept for reference)
  descriptionContainer: {
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  descriptionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  descriptionText: {
    color: '#BBB',
    fontSize: 14,
    lineHeight: 20,
  },

  // Episode navigation
  episodeNavigation: {
    marginBottom: 20,
  },
  navigationTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  episodeScroll: {
    flexGrow: 0,
  },
  episodeScrollContent: {
    paddingRight: 16,
  },
  episodeNumberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  }, currentEpisodeButton: {
    backgroundColor: '#9B81E5',
  },
  episodeNumberText: {
    color: '#DDD',
    fontWeight: '500',
  },
  currentEpisodeText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Quality selection modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qualityOptions: {
    marginTop: 8,
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  }, selectedQuality: {
    backgroundColor: 'rgba(155, 129, 229, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(155, 129, 229, 0.3)',
  },
  qualityOptionText: {
    color: '#CCC',
    fontSize: 16,
  }, selectedQualityText: {
    color: '#9B81E5',
    fontWeight: '500',
  },

  // Legacy/unused styles (kept for reference but could be removed)
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  controlsGradient: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topRightButtons: {
    flexDirection: 'row',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    paddingTop: 16,
  },
  episodeNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  videoControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  }
});