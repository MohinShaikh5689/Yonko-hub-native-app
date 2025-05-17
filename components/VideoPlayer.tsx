import React, { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Source {
  url: string;
  isM3U8: boolean;
  quality: string;
  isDub: boolean;
}

interface VideoPlayerProps {
  source: Source;
  referer: string;
  subtitles?: {
    url: string;
    lang: string;
  }[];
}

const getProxyUrl = (source: Source, referer: string) => {
  const proxyBaseUrl = "https://yonkohubproxyserver-production-ef4b.up.railway.app";
  return source.isM3U8
    ? `${proxyBaseUrl}/api/hls-proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`
    : `${proxyBaseUrl}/api/proxy?url=${encodeURIComponent(source.url)}&referer=${encodeURIComponent(referer)}`;
};

export default function VideoPlayer({ source, referer, subtitles }: VideoPlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoUrl = getProxyUrl(source, referer);

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'fullscreenChange') {
      setIsFullscreen(data.isFullscreen);
    }
  };

  // Script to inject after WebView loads
  const injectedJavaScript = `
    // Fix layout after fullscreen exit
    function fixLayout() {
      const player = videojs('videoPlayer');
      player.width('100%');
      player.height('auto');
      player.updateLayout();
    }
    true;
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link href="https://vjs.zencdn.net/8.5.2/video-js.css" rel="stylesheet" />
        <link href="https://unpkg.com/@videojs/themes@1/dist/forest/index.css" rel="stylesheet" />
        <style>
          *, *:before, *:after {
            box-sizing: border-box;
          }
          
          html, body { 
            margin: 0; 
            padding: 0;
            width: 100%; 
            height: 100%; 
            overflow: hidden;
            background-color: black; 
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
          
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            position: relative;
          }
          
          .video-js {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <video-js
            id="videoPlayer"
            class="video-js vjs-theme-forest vjs-big-play-centered"
            controls
            autoplay
            playsinline
            preload="auto"
            data-setup='{"fluid": true, "aspectRatio": "16:9"}'
          >
            <source src="${videoUrl}" type="${source.isM3U8 ? 'application/x-mpegURL' : 'video/mp4'}" />
            ${subtitles ? subtitles.map(subtitle => 
              `<track kind="subtitles" src="${subtitle.url}" srclang="${subtitle.lang.substring(0, 2).toLowerCase()}" label="${subtitle.lang}" ${subtitle.lang.toLowerCase() === 'english' ? 'default' : ''}>`
            ).join('') : ''}
            <p class="vjs-no-js">
              To view this video please enable JavaScript, and consider upgrading to a web browser that
              supports HTML5 video.
            </p>
          </video-js>
        </div>

        <script src="https://vjs.zencdn.net/8.5.2/video.min.js"></script>
        <script>
          // Initialize player with specific options
          const player = videojs('videoPlayer', {
            fluid: true,
            aspectRatio: '16:9',
            responsive: true,
            userActions: {
              hotkeys: true
            },
            controlBar: {
              volumePanel: {
                inline: false
              },
              // Make sure caption button is visible
              subsCapsButton: true
            }
          });
          
          const videoPlayer = document.getElementById('videoPlayer');
          let controlsTimeout;
          
          // Notify React Native of fullscreen changes
          function notifyFullscreenChange(isFullscreen) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'fullscreenChange',
              isFullscreen: isFullscreen
            }));
          }

          // Handle fullscreenchange event
          document.addEventListener('fullscreenchange', () => {
            const isFullscreen = !!document.fullscreenElement;
            notifyFullscreenChange(isFullscreen);
            
            if (!isFullscreen) {
              // Fix layout after exiting fullscreen
              setTimeout(() => {
                player.width('100%');
                player.height('100%');
                player.updateLayout();
              }, 100);
            }
          });

          // Toggle fullscreen on double-click
          videoPlayer.addEventListener('dblclick', () => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(err => console.error(err));
            } else {
              player.requestFullscreen().catch(err => console.error(err));
            }
          });
          
          // Ensure layout is correct on load
          player.ready(() => {
            player.updateLayout();
          });
          
          // Enable subtitles by default if available
          player.ready(function() {
            const tracks = player.textTracks();
            if (tracks && tracks.length > 0) {
              // Find English track and enable it by default
              for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].language === 'en' || tracks[i].label.toLowerCase() === 'english') {
                  tracks[i].mode = 'showing';
                  break;
                }
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[
      styles.container,
      isFullscreen && styles.fullscreenContainer
    ]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: Dimensions.get('window').width * (9/16), // 16:9 aspect ratio
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});