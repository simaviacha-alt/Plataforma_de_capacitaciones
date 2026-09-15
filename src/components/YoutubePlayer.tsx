import React, { useEffect, useRef, useState } from 'react';
import { Video } from '../types';
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface YoutubePlayerProps {
  key?: string | number;
  video: Video;
  userRole: string;
  currentProgressPercent: number;
  onProgressUpdate: (percentage: number) => void;
  onComplete: () => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export default function YoutubePlayer({
  video,
  userRole,
  currentProgressPercent,
  onProgressUpdate,
  onComplete
}: YoutubePlayerProps) {
  const containerId = `yt-player-${video.id}`;
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track continuous watch time in seconds
  const [maxTimeWatched, setMaxTimeWatched] = useState<number>(() => {
    return Math.floor((currentProgressPercent / 100) * video.duration);
  });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSkippedMessage, setHasSkippedMessage] = useState(false);
  const [percentCompleted, setPercentCompleted] = useState<number>(currentProgressPercent);
  const [useFallbackPlayer, setUseFallbackPlayer] = useState(false);

  // Refs to store up-to-date values and avoid stale closures in setInterval
  const lastTickRef = useRef<number>(Date.now());
  const maxTimeWatchedRef = useRef<number>(Math.floor((currentProgressPercent / 100) * video.duration));
  const percentCompletedRef = useRef<number>(currentProgressPercent);
  
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // Initialize YT Player API
  useEffect(() => {
    // Reset local states for new video
    const startProgress = currentProgressPercent || 0;
    const initialSeconds = Math.floor((startProgress / 100) * video.duration);
    maxTimeWatchedRef.current = initialSeconds;
    percentCompletedRef.current = startProgress;
    lastTickRef.current = Date.now();
    setMaxTimeWatched(initialSeconds);
    setPercentCompleted(startProgress);
    setIsReady(false);
    setIsPlaying(false);
    setHasSkippedMessage(false);
    setUseFallbackPlayer(false);
    retryCountRef.current = 0;

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    if (initRetryTimerRef.current) {
      clearTimeout(initRetryTimerRef.current);
    }
    if (apiCheckIntervalRef.current) {
      clearInterval(apiCheckIntervalRef.current);
    }

    // Failsafe timer: if YouTube Player API fails to initialize in 7 seconds,
    // automatically fall back to direct iframe injection so the video loads without any block.
    fallbackTimerRef.current = setTimeout(() => {
      console.log("YouTube official API timed out. Enabling direct iframe embed mode.");
      setUseFallbackPlayer(true);
      setIsReady(true);
    }, 7000);

    // If API already loaded, just mount the player
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Load YouTube IFrame API script if not loaded
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Periodically check if YT and YT.Player becomes available
      apiCheckIntervalRef.current = setInterval(() => {
        if (window.YT && window.YT.Player) {
          if (apiCheckIntervalRef.current) {
            clearInterval(apiCheckIntervalRef.current);
            apiCheckIntervalRef.current = null;
          }
          initPlayer();
        }
      }, 100);
    }

    return () => {
      stopTracking();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      if (initRetryTimerRef.current) {
        clearTimeout(initRetryTimerRef.current);
      }
      if (apiCheckIntervalRef.current) {
        clearInterval(apiCheckIntervalRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Player destruction error", e);
        }
      }
    };
  }, [video.id]);

  const initPlayer = () => {
    if (useFallbackPlayer) return;

    // Check if the DOM element is actually rendered yet to prevent YT API crash
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      if (retryCountRef.current < 20) {
        retryCountRef.current += 1;
        if (initRetryTimerRef.current) clearTimeout(initRetryTimerRef.current);
        initRetryTimerRef.current = setTimeout(initPlayer, 50);
        return;
      } else {
        console.warn("Target iframe container element not in DOM after multiple attempts. Using direct fallback.");
        setUseFallbackPlayer(true);
        setIsReady(true);
        return;
      }
    }

    try {
      if (!window.YT || !window.YT.Player) {
        throw new Error("YouTube Iframe API is not fully loaded yet.");
      }
      playerRef.current = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: video.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 1, // Let native controls open but we snap back if seek is invalid
          disablekb: 1, // Disable keyboard shortcuts to prevent fast-forwarding
          fs: 1, // Allow full screen
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch (e) {
      console.warn("Unable to initialize YouTube Player. Creating embedded safety fallback player.", e);
      setUseFallbackPlayer(true);
      setIsReady(true);
    }
  };

  const onPlayerError = (event: any) => {
    console.warn("YouTube Player event errored. Falling back.", event);
    setUseFallbackPlayer(true);
    setIsReady(true);
  };

  const onPlayerReady = (event: any) => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    setIsReady(true);
    
    // Get real duration dynamically if available
    let actualDur = video.duration;
    if (event.target && typeof event.target.getDuration === 'function') {
      const d = event.target.getDuration();
      if (d && d > 0) {
        actualDur = d;
      }
    }

    // Sync initial start position based on saved progress
    const startProgress = currentProgressPercent || 0;
    const initialSeconds = Math.floor((startProgress / 100) * actualDur);
    maxTimeWatchedRef.current = initialSeconds;
    setMaxTimeWatched(initialSeconds);

    if (startProgress > 0 && startProgress < 100) {
      event.target.seekTo(initialSeconds, true);
    }
  };

  const onPlayerStateChange = (event: any) => {
    // Stat codes: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    // Defensive values check if YT object exists fully
    const playingState = window.YT?.PlayerState?.PLAYING ?? 1;
    const pausedState = window.YT?.PlayerState?.PAUSED ?? 2;
    const endedState = window.YT?.PlayerState?.ENDED ?? 0;

    if (event.data === playingState) {
      setIsPlaying(true);
      startTracking();
    } else if (event.data === pausedState) {
      setIsPlaying(false);
      stopTracking();
    } else if (event.data === endedState) {
      setIsPlaying(false);
      stopTracking();
      handleVideoComplete();
    }
  };

  const startTracking = () => {
    stopTracking();
    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;

      const now = Date.now();
      // Calculate real time elapsed since last check
      const elapsedSeconds = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      // Read values from refs to prevent any active stale closure issues
      const currentMax = maxTimeWatchedRef.current;
      const currentCompletedPct = percentCompletedRef.current;
      const currentTime = playerRef.current.getCurrentTime();
      
      // Get exact real duration dynamically from player
      let effDuration = video.duration;
      if (typeof playerRef.current.getDuration === 'function') {
        const d = playerRef.current.getDuration();
        if (d && d > 0) {
          effDuration = d;
        }
      }
      
      // Dynamic allowance window: can be up to 3.5 seconds ahead, or physical elapsed seconds plus a small buffer
      // This protects against browser throttle timers and lag perfectly!
      const maxAllowedTime = currentMax + Math.max(3.5, elapsedSeconds + 1.5);
      
      // anti-skip check: if user seeks ahead of maxTimeWatched by more than allowed threshold
      if (currentTime > maxAllowedTime) {
        setHasSkippedMessage(true);
        // Snap back to latest verified maxTimeWatched
        playerRef.current.seekTo(currentMax, true);
        setTimeout(() => setHasSkippedMessage(false), 3000);
      } else {
        // If they are playing forward, increase the maxTimeWatched boundary
        if (currentTime > currentMax) {
          const newMax = Math.floor(currentTime);
          maxTimeWatchedRef.current = newMax;
          setMaxTimeWatched(newMax);

          // Calculate current percentage
          const pct = Math.min(100, Math.floor((newMax / effDuration) * 100));
          
          // Update in consistent 5% increments for smooth recording without flooding requests
          const blockPct = Math.floor(pct / 5) * 5;
          if (blockPct > currentCompletedPct && blockPct < 100) {
            percentCompletedRef.current = blockPct;
            setPercentCompleted(blockPct);
            onProgressUpdate(blockPct);
          }

          // If 98% or more is reached, treat as 100% and complete
          if (pct >= 98 && currentCompletedPct < 100) {
            percentCompletedRef.current = 100;
            setPercentCompleted(100);
            onProgressUpdate(100);
            onComplete();
          }
        }
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVideoComplete = () => {
    percentCompletedRef.current = 100;
    setPercentCompleted(100);
    onProgressUpdate(100);
    onComplete();
  };

  // Skip simulation for testing / demo triggers
  const handleFastTrack = () => {
    let effDuration = video.duration;
    if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
      const d = playerRef.current.getDuration();
      if (d && d > 0) {
        effDuration = d;
      }
    }
    percentCompletedRef.current = 100;
    maxTimeWatchedRef.current = effDuration;
    setPercentCompleted(100);
    setMaxTimeWatched(effDuration);
    onProgressUpdate(100);
    onComplete();
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(effDuration - 1, true);
      } catch (e) {}
    }
  };

  const handleOpenExternalYoutube = () => {
    percentCompletedRef.current = 100;
    const dur = video.duration;
    maxTimeWatchedRef.current = dur;
    setPercentCompleted(100);
    setMaxTimeWatched(dur);
    onProgressUpdate(100);
    onComplete();
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl" id="yt_player_container">
      {/* Banner / Indicators */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${useFallbackPlayer ? 'bg-amber-400' : isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-medium">
            {useFallbackPlayer ? 'Reproductor Directo' : isPlaying ? 'Reproduciendo' : 'En pausa'}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {percentCompleted === 100 ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
              <CheckCircle className="w-3.5 h-3.5" /> Completado
            </span>
          ) : (
            <span className="text-xs text-amber-400 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
              Progreso: {percentCompleted}%
            </span>
          )}
        </div>
      </div>

      {/* Video Iframe Frame */}
      <div className="relative aspect-video bg-neutral-950 flex items-center justify-center">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-400 z-10">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono">Cargando reproductor oficial de YouTube...</span>
          </div>
        )}

        {useFallbackPlayer ? (
          <div className="w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&controls=1&rel=0`}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsReady(true)}
            />
          </div>
        ) : (
          /* The YouTube iframe element */
          <div className="w-full h-full">
            <div id={containerId} className="w-full h-full" />
          </div>
        )}

        {/* Skip block notification overlay */}
        {hasSkippedMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-semibold border border-red-500 animate-bounce">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>⚠️ No se permite adelantar el video. Debe verlo de forma continua.</span>
          </div>
        )}
      </div>

      {/* Real-time Video Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentCompleted}%` }}
        />
      </div>

      {/* Bottom status bar info */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
          <div>
            <p className="font-medium text-slate-100">{video.title}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{video.description}</p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenExternalYoutube}
            className="text-[10px] text-emerald-400 hover:underline inline-flex items-center gap-1.5 font-mono hover:text-emerald-300 self-start md:self-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            ↗ Abrir en YouTube.com
          </a>
        </div>
        
        {/* Anti-skipping notice */}
        <div className="mt-3 flex items-start gap-2 bg-slate-900/50 p-2.5 rounded border border-slate-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-slate-400 leading-normal">
            <strong className="text-slate-300 block mb-0.5">Control de Visualización Activo</strong>
            El sistema de seguridad de Planta Viacha no permite adelantar los videos de inducción e integra sincronización de avance. Si prefiere, presione <strong className="text-emerald-450">↗ Abrir en YouTube.com</strong> para reproducirlo externamente; esto registrará automáticamente su visualización completa en nuestro sistema.
          </div>
        </div>

        {/* Video progress indicator and manual confirmation */}
        {percentCompleted < 100 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-slate-400">
              Progreso actual del video: <span className="text-emerald-400 font-bold">{percentCompleted}%</span>
            </div>
            <button
              type="button"
              onClick={handleVideoComplete}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
              Marcar Video como Visto (100%)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
