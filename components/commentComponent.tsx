import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Comment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user: {
    name: string;
    profile: string;
  }
}

interface CommentSectionProps {
  animeId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ animeId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  // Animation for loading
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get token directly from AsyncStorage
  const fetchToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  // Add comment function
  const addComment = async () => {
    if (!commentText.trim() || !token) return;
    
    Keyboard.dismiss();
    setSubmittingComment(true);
    
    try {
      await axios.post('https://mugiwarahubbackend-production.up.railway.app/api/anime/comment', {
        comment: commentText,
        AnimeId: animeId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Clear the comment text
      setCommentText("");

      // Fetch all comments 
      fetchComments();
    } catch (error: any) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const response = await axios.get(`https://mugiwarahubbackend-production.up.railway.app/api/anime/comment/${animeId}`);

      if (response.data.comments) {
        const allComments = response.data.comments;

        const formattedComments = allComments.map((comment: any) => ({
          id: comment.id,
          userId: comment.userId,
          content: comment.content,
          user: {
            name: comment.user?.name || "Anonymous",
            profile: comment.user?.profile || "",
          },
          createdAt: comment.createdAt,
        }));

        setComments(formattedComments);
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Sign in navigation
  const navigateToSignIn = () => {
    router.push('/login');
  };

  // Scroll to top
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Keyboard visibility handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setShowCommentBox(false)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setShowCommentBox(true)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load data when component mounts or when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchToken();
      if (animeId) {
        fetchComments();
      }
    }, [animeId])
  );

  // Comment item renderer - without user profile navigation
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.user.profile || "https://i.pinimg.com/736x/9f/c5/cf/9fc5cf14dc2fdefaacf70d52a12415b3.jpg" }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
      </View>
      
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{item.user.name}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  // Loading placeholder renderer
  const renderLoadingPlaceholder = () => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.loadingComment}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingContent}>
            <View style={[styles.loadingText, { width: '40%' }]} />
            <View style={[styles.loadingText, { width: '70%' }]} />
            <View style={[styles.loadingText, { width: '50%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // Empty comments renderer
  const renderEmptyComments = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubble-outline" size={32} color="#9B81E5" />
      </View>
      <Text style={styles.emptyTitle}>No comments yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to share your thoughts about this anime!
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(155, 129, 229, 0.15)', 'rgba(155, 129, 229, 0.05)']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.dot} />
            <Text style={styles.headerTitle}>Comments</Text>
          </View>
          <Text style={styles.commentCount}>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.commentsContainer}
        keyboardVerticalOffset={100}
      >
        {/* Comments list */}
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoadingComments ? renderLoadingPlaceholder() : renderEmptyComments()
          }
        />

        {/* Comment input */}
        <View style={styles.commentInputContainer}>
          {token ? (
            <>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your thoughts..."
                placeholderTextColor="#9B81E580"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!commentText.trim() || submittingComment) && styles.disabledButton
                ]}
                onPress={addComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <LinearGradient
              colors={['rgba(155, 129, 229, 0.2)', 'rgba(116, 97, 171, 0.2)']}
              style={styles.signInPromptContainer}
            >
              <Text style={styles.signInPromptText}>
                Login to join the conversation
              </Text>
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={navigateToSignIn}
              >
                <LinearGradient
                  colors={['#9B81E5', '#7461AB']}
                  style={styles.signInButtonGradient}
                >
                  <Text style={styles.signInButtonText}>Sign In / Register</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Floating button to scroll to top */}
      {showCommentBox && comments.length > 3 && (
        <TouchableOpacity 
          style={styles.scrollTopButton}
          onPress={scrollToTop}
        >
          <LinearGradient
            colors={['#9B81E5', '#7461AB']}
            style={styles.scrollTopButtonGradient}
          >
            <Ionicons name="chatbubbles" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(155, 129, 229, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9B81E5',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  commentCount: {
    fontSize: 14,
    color: '#9B81E5',
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 100,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(155, 129, 229, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 129, 229, 0.1)',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(155, 129, 229, 0.3)',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9B81E5',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#e1e1e1',
    lineHeight: 20,
  },
  loadingContainer: {
    marginVertical: 16,
  },
  loadingComment: {
    flexDirection: 'row',
    marginBottom: 16,
    opacity: 0.5,
  },
  loadingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 12,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(155, 129, 229, 0.15)',
    borderRadius: 12,
    backgroundColor: 'rgba(155, 129, 229, 0.03)',
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(155, 129, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9B81E580',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(155, 129, 229, 0.1)',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(155, 129, 229, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(155, 129, 229, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    bottom: 22,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9B81E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  scrollTopButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  scrollTopButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInPromptContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInPromptText: {
    color: '#9B81E5',
    fontSize: 16,
    marginBottom: 12,
  },
  signInButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  signInButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CommentSection;