'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YTPlayerInstance } from '@/types/youtube';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate: (currentTime: number) => void;
  playerRef?: React.MutableRefObject<YTPlayerInstance | null>;
  onReady?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onTimeUpdate,
  playerRef: externalPlayerRef,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayerInstance | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [embedError, setEmbedError] = useState<number | null>(null);

  // Stop sync interval
  const stopSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // 100ms sync loop for real-time subtitle tracking
  const startSync = useCallback(() => {
    stopSync();
    syncIntervalRef.current = setInterval(() => {
      if (playerInstanceRef.current && typeof playerInstanceRef.current.getCurrentTime === 'function') {
        try {
          const time = playerInstanceRef.current.getCurrentTime();
          onTimeUpdate(time);
        } catch {
          // Player might be re-initializing
        }
      }
    }, 100);
  }, [onTimeUpdate, stopSync]);

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    setEmbedError(null);
    setIsLoading(true);

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      // Destroy previous instance
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // Ignore
        }
      }

      const playerId = `yt-player-${Math.random().toString(36).substring(7)}`;
      const targetDiv = document.createElement('div');
      targetDiv.id = playerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(targetDiv);

      const player = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            setIsLoading(false);
            playerInstanceRef.current = event.target;
            if (externalPlayerRef) {
              externalPlayerRef.current = event.target;
            }
            onReady?.();
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
            if (event.data === 1) {
              startSync();
            } else if (event.data === 2 || event.data === 0) {
              // Read current time once when paused
              if (playerInstanceRef.current) {
                onTimeUpdate(playerInstanceRef.current.getCurrentTime());
              }
              stopSync();
            }
          },
          onError: (event) => {
            if (!isMounted) return;
            console.error('YouTube Player Error Code:', event.data);
            setEmbedError(event.data);
            setIsLoading(false);
            stopSync();
          },
        },
      });
    };

    // Load YouTube IFrame API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      stopSync();
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // Ignore
        }
      }
    };
  }, [videoId, externalPlayerRef, onReady, onTimeUpdate, startSync, stopSync]);

  return (
    <div className="relative w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl group">
      {/* Container where YT Player is injected */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm z-10 transition-opacity">
          <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
          <p className="text-sm text-neutral-400 font-medium">Khởi tạo trình phát YouTube...</p>
        </div>
      )}

      {/* Embed Restriction Fallback Card (Section 6: Code 101/150) */}
      {embedError !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-md p-6 text-center z-20">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Video giới hạn phát nhúng ({embedError === 101 || embedError === 150 ? 'Mã 101/150' : `Mã lỗi ${embedError}`})
          </h3>
          <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
            Chủ sở hữu video đã tắt tính năng phát trên trang web bên ngoài. Bạn vẫn có thể xem trực tiếp trên YouTube và đồng bộ phụ đề tại đây.
          </p>
          <div className="flex items-center gap-3">
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              <span>Mở trên YouTube</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => {
                setEmbedError(null);
                setIsLoading(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
