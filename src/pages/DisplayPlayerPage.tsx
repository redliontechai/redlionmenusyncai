import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Flame,
  Fish,
  Coffee,
  Pizza,
  Utensils,
  Crown,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Clock,
  Sparkles,
  Tv,
  AlertTriangle,
  Sun,
  CheckCircle2,
  Settings,
  QrCode,
  Volume2,
  VolumeX,
  Film,
  X,
  Bell,
  BellOff,
} from 'lucide-react';
import { useMenuSync } from '../context/MenuSyncContext';
import {
  filterCategoriesForActiveSchedule,
  getActiveDaypartSchedule,
  getCurrentHHMM,
} from '../utils/dayparting';
import {
  CardStylePreset,
  LayoutTemplate,
  OrganizationBranding,
  Product,
  Screen,
} from '../types/menu';
import {
  playPromoAttentionChime,
  playChefRecommendationChime,
} from '../utils/soundEffects';

interface DisplayPlayerPageProps {
  embeddedScreenId?: string;
  embeddedMode?: boolean;
}

export const BrandLogoIcon: React.FC<{
  iconName: OrganizationBranding['logo_icon_name'];
  className?: string;
}> = ({ iconName, className = 'w-7 h-7 text-white' }) => {
  switch (iconName) {
    case 'Fish':
      return <Fish className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Pizza':
      return <Pizza className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Flame':
    default:
      return <Flame className={className} />;
  }
};

export const DisplayPlayerPage: React.FC<DisplayPlayerPageProps> = ({
  embeddedScreenId,
  embeddedMode = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    state,
    isOfflineMode,
    isSupabaseRealtimeConnected,
    updateScreenConfig,
    stopFlashPromotion,
    clearLiveFullscreenVideoSpot,
  } = useMenuSync();

  const screenIdParam =
    embeddedScreenId ||
    searchParams.get('screen') ||
    state.screens[0]?.id ||
    'scr-counter-1';
  const pairingModeParam = searchParams.get('pair') === 'new';

  const branding = state.organization.branding;

  const [generatedPairingCode] = useState<string>(() => {
    const saved = sessionStorage.getItem('rl_unpaired_code');
    if (saved) return saved;
    const code = `RL-${Math.floor(1000 + Math.random() * 9000)}`;
    sessionStorage.setItem('rl_unpaired_code', code);
    return code;
  });

  const newlyPairedScreen = useMemo(
    () =>
      state.screens.find(
        (s) =>
          s.pairing_code.toUpperCase() === generatedPairingCode.toUpperCase()
      ),
    [state.screens, generatedPairingCode]
  );

  useEffect(() => {
    if (pairingModeParam && newlyPairedScreen) {
      setSearchParams({ screen: newlyPairedScreen.id });
    }
  }, [pairingModeParam, newlyPairedScreen, setSearchParams]);

  const activeScreen: Screen = useMemo(() => {
    return (
      state.screens.find((s) => s.id === screenIdParam) ||
      state.screens[0] || {
        id: 'scr-default',
        branch_id: state.activeBranchId,
        name: 'Pantalla Principal Kiosk',
        pairing_code: 'RL-1042',
        is_paired: true,
        status: 'online',
        orientation: 'landscape',
        resolution: '3840x2160 (4K UHD)',
        layout_template: 'split_promo',
        hardware_type: 'Amazon Signage Stick',
        is_outdoor_high_nits: false,
        last_heartbeat: new Date().toISOString(),
        video_mode: 'side_zone_loop',
        promo_video_url: branding.default_promo_video_url,
        promo_video_title: '🔥 Especialidad en Vivo',
        audio_enabled: true,
        volume_percent: 80,
        spot_interval_minutes: 10,
        spot_duration_seconds: 15,
        flash_chime_enabled: true,
        chef_chime_enabled: false,
      }
    );
  }, [
    state.screens,
    screenIdParam,
    state.activeBranchId,
    branding.default_promo_video_url,
  ]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHudControls, setShowHudControls] = useState(false);
  const [showAudioControlMenu, setShowAudioControlMenu] = useState(false);
  const hudTimeoutRef = useRef<number | null>(null);

  const revealHudTemporarily = () => {
    setShowHudControls(true);
    if (hudTimeoutRef.current) {
      window.clearTimeout(hudTimeoutRef.current);
    }
    hudTimeoutRef.current = window.setTimeout(() => {
      setShowHudControls(false);
      setShowAudioControlMenu(false);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (hudTimeoutRef.current) {
        window.clearTimeout(hudTimeoutRef.current);
      }
    };
  }, []);
  const [featuredSlideIdx, setFeaturedSlideIdx] = useState(0);
  const [clockString, setClockString] = useState(() =>
    getCurrentHHMM(state.simulatedTimeOverride)
  );
  const [promoCountdown, setPromoCountdown] = useState<string>('44:59');
  const [isPromoExpired, setIsPromoExpired] = useState<boolean>(false);

  // Audio unlock state (Browsers require 1 click to unlock unmuted video playback unless running in Kiosk OS)
  const [browserAudioUnlocked, setBrowserAudioUnlocked] =
    useState<boolean>(false);
  const sideVideoRef = useRef<HTMLVideoElement | null>(null);
  const spotVideoRef = useRef<HTMLVideoElement | null>(null);

  // Reliable auto-play callback ref so Fire TV Silk / Chromium NEVER starts on a black paused video frame
  const attachSideVideoRef = (el: HTMLVideoElement | null) => {
    sideVideoRef.current = el;
    if (!el) return;
    el.defaultMuted = true;
    el.volume = Math.max(
      0,
      Math.min(1, (activeScreen.volume_percent || 80) / 100)
    );
    const shouldUnmute = Boolean(
      activeScreen.audio_enabled && browserAudioUnlocked
    );
    el.muted = !shouldUnmute;
    if (el.paused) {
      el.play().catch(() => {
        el.defaultMuted = true;
        el.muted = true;
        el.play().catch(() => {});
      });
    }
  };

  // 75" Insignia TV Calibration State (Overscan Safe Area & Image Aspect Framing)
  const [tvCalibrationMode, setTvCalibrationMode] = useState<
    'insignia_75_safe' | 'insignia_75_compact' | 'standard'
  >(() => {
    const saved = localStorage.getItem('rl_tv75_calibration_mode');
    if (
      saved === 'insignia_75_safe' ||
      saved === 'insignia_75_compact' ||
      saved === 'standard'
    ) {
      return saved;
    }
    return 'insignia_75_safe';
  });

  const [imageFitMode, setImageFitMode] = useState<'cover' | 'contain'>(() => {
    const saved = localStorage.getItem('rl_tv75_image_fit');
    return saved === 'contain' ? 'contain' : 'cover';
  });

  const cycleTvCalibrationMode = () => {
    const next =
      tvCalibrationMode === 'insignia_75_safe'
        ? 'insignia_75_compact'
        : tvCalibrationMode === 'insignia_75_compact'
        ? 'standard'
        : 'insignia_75_safe';
    setTvCalibrationMode(next);
    localStorage.setItem('rl_tv75_calibration_mode', next);
  };

  const toggleImageFitMode = () => {
    const next = imageFitMode === 'cover' ? 'contain' : 'cover';
    setImageFitMode(next);
    localStorage.setItem('rl_tv75_image_fit', next);
  };

  // Scheduled or Live Fullscreen Spot Overlay state
  const [activeFullscreenSpot, setActiveFullscreenSpot] = useState<{
    videoUrl: string;
    title: string;
    subtitle: string;
    secondsRemaining: number;
  } | null>(null);

  // Sync volume & mute to side video element whenever screen config changes
  useEffect(() => {
    const vid = sideVideoRef.current;
    if (!vid) return;
    vid.defaultMuted = true;
    vid.volume = Math.max(0, Math.min(1, (activeScreen.volume_percent || 80) / 100));
    const shouldUnmute = Boolean(activeScreen.audio_enabled && browserAudioUnlocked);
    vid.muted = !shouldUnmute;
    vid.play().catch(() => {
      vid.defaultMuted = true;
      vid.muted = true;
      vid.play().catch(() => {});
    });
  }, [
    activeScreen.id,
    activeScreen.video_mode,
    activeScreen.audio_enabled,
    activeScreen.volume_percent,
    activeScreen.promo_video_url,
    browserAudioUnlocked,
  ]);

  // Listen to Flash Promotion activation and play attention chime if enabled on this TV
  const lastFlashPromoIdRef = useRef<string | null>(null);
  const activeFlashPromo = useMemo(
    () => state.flashPromotions.find((fp) => fp.is_active),
    [state.flashPromotions]
  );

  useEffect(() => {
    if (
      activeFlashPromo &&
      activeFlashPromo.id !== lastFlashPromoIdRef.current
    ) {
      lastFlashPromoIdRef.current = activeFlashPromo.id;
      if (
        activeScreen.flash_chime_enabled &&
        (activeFlashPromo.play_sound_chime ?? true)
      ) {
        playPromoAttentionChime(activeScreen.volume_percent || 85);
      }
    }
  }, [
    activeFlashPromo,
    activeScreen.flash_chime_enabled,
    activeScreen.volume_percent,
  ]);

  // Listen to Remote Live Fullscreen Video Spot triggered from Backoffice
  const lastSpotTriggerIdRef = useRef<string | null>(null);
  useEffect(() => {
    const spot = state.liveSpotTrigger;
    if (!spot || spot.id === lastSpotTriggerIdRef.current) return;
    if (spot.targetScreenId !== 'ALL' && spot.targetScreenId !== activeScreen.id)
      return;

    lastSpotTriggerIdRef.current = spot.id;
    if (activeScreen.audio_enabled || spot.forceAudio) {
      playPromoAttentionChime(activeScreen.volume_percent || 85);
    }

    setActiveFullscreenSpot({
      videoUrl:
        spot.videoUrl ||
        activeScreen.promo_video_url ||
        branding.default_promo_video_url,
      title: spot.title,
      subtitle: spot.subtitle,
      secondsRemaining: spot.durationSeconds || 15,
    });
  }, [
    state.liveSpotTrigger,
    activeScreen.id,
    activeScreen.audio_enabled,
    activeScreen.volume_percent,
    activeScreen.promo_video_url,
    branding.default_promo_video_url,
  ]);

  // Periodic Scheduled Fullscreen Commercial Spot Timer (Mode B: fullscreen_spot_interval / both_side_and_spot)
  useEffect(() => {
    if (
      activeScreen.video_mode !== 'fullscreen_spot_interval' &&
      activeScreen.video_mode !== 'both_side_and_spot'
    ) {
      return;
    }
    const intervalMs =
      Math.max(1, activeScreen.spot_interval_minutes || 10) * 60 * 1000;
    const timer = setInterval(() => {
      if (activeScreen.audio_enabled) {
        playPromoAttentionChime(activeScreen.volume_percent || 80);
      }
      setActiveFullscreenSpot({
        videoUrl:
          activeScreen.promo_video_url || branding.default_promo_video_url,
        title:
          activeScreen.promo_video_title ||
          branding.default_promo_video_title ||
          '🔥 PROMOCIÓN ESPECIAL EN VIVO',
        subtitle:
          branding.default_promo_video_subtitle ||
          '¡Pregunta en mostrador por nuestras especialidades recién hechas!',
        secondsRemaining: activeScreen.spot_duration_seconds || 15,
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    activeScreen.video_mode,
    activeScreen.spot_interval_minutes,
    activeScreen.spot_duration_seconds,
    activeScreen.promo_video_url,
    activeScreen.promo_video_title,
    activeScreen.audio_enabled,
    activeScreen.volume_percent,
    branding.default_promo_video_url,
    branding.default_promo_video_title,
    branding.default_promo_video_subtitle,
  ]);

  // Countdown for active Fullscreen Spot Overlay
  useEffect(() => {
    if (!activeFullscreenSpot) return;
    const timer = setInterval(() => {
      setActiveFullscreenSpot((prev) => {
        if (!prev) return null;
        if (prev.secondsRemaining <= 1) {
          clearLiveFullscreenVideoSpot();
          return null;
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeFullscreenSpot, clearLiveFullscreenVideoSpot]);

  useEffect(() => {
    const updateTimers = () => {
      setClockString(getCurrentHHMM(state.simulatedTimeOverride));

      if (activeFlashPromo) {
        const diffMs = new Date(activeFlashPromo.expires_at).getTime() - Date.now();
        if (diffMs > 0) {
          setIsPromoExpired(false);
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          setPromoCountdown(
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          );
        } else {
          setPromoCountdown('00:00');
          setIsPromoExpired(true);
        }
      } else {
        setIsPromoExpired(false);
      }
    };
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [state.simulatedTimeOverride, activeFlashPromo]);

  const activeSchedule = useMemo(
    () =>
      getActiveDaypartSchedule(
        state.schedules,
        activeScreen.branch_id,
        activeScreen.id,
        state.simulatedTimeOverride
      ),
    [state.schedules, activeScreen.branch_id, activeScreen.id, state.simulatedTimeOverride]
  );

  const visibleCategories = useMemo(
    () => filterCategoriesForActiveSchedule(state.categories, activeSchedule),
    [state.categories, activeSchedule]
  );

  const featuredProducts = useMemo(
    () => state.products.filter((p) => p.is_featured && p.is_available),
    [state.products]
  );

  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedSlideIdx((prev) => {
        const nextIdx = (prev + 1) % featuredProducts.length;
        if (activeScreen.chef_chime_enabled) {
          playChefRecommendationChime(activeScreen.volume_percent || 75);
        }
        return nextIdx;
      });
    }, 6500);
    return () => clearInterval(timer);
  }, [
    featuredProducts.length,
    activeScreen.chef_chime_enabled,
    activeScreen.volume_percent,
  ]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Ignore if not supported
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release().catch(() => {});
    };
  }, []);

  const unlockAudioOnTV = () => {
    setBrowserAudioUnlocked(true);
    playPromoAttentionChime(activeScreen.volume_percent || 80);
    if (!activeScreen.audio_enabled) {
      updateScreenConfig(activeScreen.id, { audio_enabled: true });
    }
    if (sideVideoRef.current) {
      sideVideoRef.current.muted = false;
      sideVideoRef.current.volume = Math.max(
        0,
        Math.min(1, (activeScreen.volume_percent || 80) / 100)
      );
      sideVideoRef.current.play().catch(() => {});
    }
    if (spotVideoRef.current) {
      spotVideoRef.current.muted = false;
      spotVideoRef.current.volume = Math.max(
        0,
        Math.min(1, (activeScreen.volume_percent || 80) / 100)
      );
      spotVideoRef.current.play().catch(() => {});
    }
  };

  const launchInstantTestVideoAndSound = () => {
    setBrowserAudioUnlocked(true);
    playPromoAttentionChime(activeScreen.volume_percent || 85);
    if (!activeScreen.audio_enabled) {
      updateScreenConfig(activeScreen.id, {
        audio_enabled: true,
        volume_percent: 85,
      });
    }
    setActiveFullscreenSpot({
      videoUrl: '/videos/calibracion-tv-75-audio.mp4',
      title: 'PRUEBA DE IMAGEN 16:9 Y SONIDO ESTÉREO — TV INSIGNIA 75"',
      subtitle:
        'Verifica que el marco verde encuadre completo en tu TV de 75 pulgadas y escucha la pista musical estéreo',
      secondsRemaining: 12,
    });
  };

  const toggleFullscreen = () => {
    setBrowserAudioUnlocked(true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const rawEffectiveLayout: LayoutTemplate =
    (activeSchedule?.layout_override as LayoutTemplate) ||
    activeScreen.layout_template;

  // On any horizontal 16:9 TV (like Insignia 75" where width >= height), never collapse into a narrow portrait_totem strip
  const isHorizontalTvViewport =
    typeof window !== 'undefined' ? window.innerWidth >= window.innerHeight : true;

  const effectiveLayout: LayoutTemplate =
    rawEffectiveLayout === 'portrait_totem' && isHorizontalTvViewport
      ? 'split_promo'
      : rawEffectiveLayout;

  const headingFontClass =
    branding.font_preset === 'editorial_serif'
      ? 'font-serif tracking-wide'
      : branding.font_preset === 'bold_display'
      ? "font-['Outfit'] tracking-wider uppercase"
      : "font-['Outfit'] tracking-tight";

  const getCategoryCardClasses = (cardStyle: CardStylePreset) => {
    switch (cardStyle) {
      case 'sharp_minimal':
        return 'rounded-none border-l-4 backdrop-blur-md shadow-2xl';
      case 'warm_bordered':
        return 'rounded-3xl border-2 backdrop-blur-md shadow-xl';
      case 'glass_rounded':
      default:
        return 'rounded-2xl border backdrop-blur-md shadow-xl';
    }
  };

  // =========================================================================
  // 1. UNPAIRED SCREEN PAIRING VIEW (<30s 6-Digit Pairing Flow)
  // =========================================================================
  if (pairingModeParam && !newlyPairedScreen) {
    return (
      <div
        className="min-h-screen text-white flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{ backgroundColor: branding.background_color }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${branding.primary_color} 0%, transparent 70%)`,
          }}
        />
        <div
          className="max-w-2xl w-full border rounded-3xl p-10 text-center shadow-2xl backdrop-blur-xl relative z-10"
          style={{
            backgroundColor: branding.surface_color,
            borderColor: `${branding.primary_color}55`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{
              backgroundColor: `${branding.primary_color}25`,
              border: `1px solid ${branding.primary_color}`,
            }}
          >
            <Tv
              className="w-8 h-8 animate-pulse"
              style={{ color: branding.accent_color }}
            />
          </div>
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4"
            style={{
              backgroundColor: `${branding.primary_color}25`,
              color: branding.accent_color,
              border: `1px solid ${branding.primary_color}55`,
            }}
          >
            Modo Kiosk 24/7 • Vinculación Rápida (&lt;30s)
          </span>
          <h1 className={`text-3xl md:text-4xl font-black mb-3 ${headingFontClass}`}>
            Vincula esta Pantalla a {state.organization.name}
          </h1>
          <p className="text-zinc-300 text-base mb-8">
            Abre tu panel{' '}
            <strong className="text-white">Backoffice Admin → Pantallas</strong> e
            ingresa el siguiente código único de vinculación:
          </p>

          <div
            className="border-2 border-dashed rounded-2xl py-8 px-6 mb-8"
            style={{
              backgroundColor: branding.background_color,
              borderColor: branding.accent_color,
            }}
          >
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">
              Código de Vinculación en Vivo
            </div>
            <div
              className="text-6xl md:text-7xl font-black tracking-[0.2em] font-mono select-all"
              style={{ color: branding.accent_color }}
            >
              {generatedPairingCode}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Caché Offline IndexedDB Activo (35 días)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-400" />
              Esperando señal WebSocket...
            </span>
          </div>

          {!embeddedMode && (
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setSearchParams({ screen: state.screens[0]?.id || 'scr-counter-1' })
                }
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                Ver Pantalla Principal
              </button>
              <Link
                to="/admin?tab=screens"
                target="_blank"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition"
                style={{ backgroundColor: branding.primary_color }}
              >
                Abrir Admin en otra pestaña para vincular
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentFeaturedProduct: Product | undefined =
    featuredProducts[featuredSlideIdx % Math.max(1, featuredProducts.length)] ||
    state.products[0];

  const isHighContrastDriveThru =
    activeScreen.is_outdoor_high_nits || effectiveLayout === 'drive_thru';

  const showSideVideoLoop = activeScreen.video_mode !== 'disabled';

  const activeVideoUrl =
    activeScreen.promo_video_url || branding.default_promo_video_url;

  const tvPaddingClass =
    tvCalibrationMode === 'insignia_75_compact'
      ? 'px-[2.5vw] py-[1.5vh]'
      : tvCalibrationMode === 'insignia_75_safe'
      ? 'px-[1.2vw] py-[0.6vh]'
      : 'px-0 py-0';

  // =========================================================================
  // 2. ACTIVE DISPLAY PLAYER KIOSK RENDERER (LOCKED TO 100VH 16:9 TV FRAME)
  // =========================================================================
  return (
    <div
      onClick={() => {
        if (activeScreen.audio_enabled && !browserAudioUnlocked) {
          setBrowserAudioUnlocked(true);
        }
        revealHudTemporarily();
      }}
      onMouseMove={revealHudTemporarily}
      onMouseLeave={() => {
        setShowHudControls(false);
        setShowAudioControlMenu(false);
      }}
      className={`${
        embeddedMode ? 'min-h-full' : 'h-screen max-h-screen'
      } w-full flex flex-col justify-between select-none overflow-hidden relative transition-all duration-500 ${tvPaddingClass}`}
      style={{
        backgroundColor: isHighContrastDriveThru
          ? '#000000'
          : branding.background_color,
        color: branding.text_color,
      }}
    >
      {/* Dynamic Brand Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 12% 15%, ${branding.primary_color}55, transparent 50%), radial-gradient(circle at 88% 82%, ${branding.accent_color}40, transparent 55%)`,
        }}
      />

      {/* =====================================================================
          FULLSCREEN COMMERCIAL VIDEO SPOT OVERLAY (WITH AUDIO & COUNTDOWN)
         ===================================================================== */}
      {activeFullscreenSpot && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-fadeIn">
          <video
            ref={spotVideoRef}
            src={activeFullscreenSpot.videoUrl}
            autoPlay
            loop
            playsInline
            muted={!browserAudioUnlocked}
            onLoadedMetadata={(e) => {
              e.currentTarget.volume = Math.max(
                0.2,
                Math.min(1, (activeScreen.volume_percent || 85) / 100)
              );
              if (browserAudioUnlocked) {
                e.currentTarget.muted = false;
              }
            }}
            className={`absolute inset-0 w-full h-full ${
              activeFullscreenSpot.videoUrl.includes('calibracion') ||
              imageFitMode === 'contain'
                ? 'object-contain bg-black'
                : 'object-cover'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/60" />

          {/* Top Bar of Commercial Spot */}
          <div className="relative z-10 p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-xl flex items-center gap-2"
                style={{ backgroundColor: branding.primary_color }}
              >
                <Film className="w-4 h-4" /> Spot Promocional en Vivo
              </span>
              {activeScreen.audio_enabled && (
                <span className="px-3 py-1 rounded-full bg-black/60 border border-white/20 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Audio TV:{' '}
                  {activeScreen.volume_percent}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-black/75 border border-white/20 text-sm font-mono font-bold text-white">
                Volviendo al menú en{' '}
                <span style={{ color: branding.accent_color }}>
                  {activeFullscreenSpot.secondsRemaining}s
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveFullscreenSpot(null);
                  clearLiveFullscreenVideoSpot();
                }}
                className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer"
                title="Cerrar comercial"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Call-To-Action of Commercial Spot */}
          <div className="relative z-10 p-10 max-w-4xl">
            <h2
              className={`text-4xl md:text-6xl font-black text-white uppercase leading-tight mb-3 drop-shadow-2xl ${headingFontClass}`}
            >
              {activeFullscreenSpot.title}
            </h2>
            <p
              className="text-xl md:text-2xl font-bold drop-shadow-lg"
              style={{ color: branding.accent_color }}
            >
              {activeFullscreenSpot.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Hover Kiosk Controls Bar (Auto-hides after 4.5s on TV when remote is idle + manual close X) */}
      {!embeddedMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            revealHudTemporarily();
          }}
          className={`fixed top-2 right-3 z-40 flex flex-wrap items-center gap-1.5 bg-zinc-950/95 border border-zinc-700/90 rounded-xl px-2.5 py-1 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            showHudControls
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <select
            value={activeScreen.id}
            onChange={(e) => setSearchParams({ screen: e.target.value })}
            className="bg-zinc-800 text-[11px] text-zinc-100 font-medium rounded-lg px-2 py-1 border border-zinc-700 focus:outline-none cursor-pointer"
          >
            {state.screens.map((scr) => (
              <option key={scr.id} value={scr.id}>
                📺 {scr.name} ({scr.audio_enabled ? '🔊 Audio ON' : '🔇 Mute'})
              </option>
            ))}
          </select>

          <button
            onClick={() => setSearchParams({ pair: 'new' })}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-amber-400 border border-zinc-700 transition cursor-pointer"
          >
            + Simular TV Nueva
          </button>

          <Link
            to="/admin"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition"
            style={{ backgroundColor: branding.primary_color }}
          >
            <Settings className="w-3 h-3" />
            Backoffice
          </Link>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hudTimeoutRef.current) {
                window.clearTimeout(hudTimeoutRef.current);
              }
              setShowHudControls(false);
              setShowAudioControlMenu(false);
            }}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
            title="Ocultar controles ahora"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ULTRA-COMPACT SINGLE-ROW 16:9 TV HEADER BAR (OPTIMIZED FOR 75" INSIGNIA FIRE TV 960x540 / 4K) */}
      <header
        className="relative z-10 flex items-center justify-between gap-2 px-4 py-2 border-b backdrop-blur-md shrink-0"
        style={{
          backgroundColor: `${branding.background_color}f2`,
          borderColor: `${branding.primary_color}40`,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={state.organization.name}
              className="w-10 h-10 rounded-xl object-cover border-2 shadow shrink-0"
              style={{ borderColor: branding.accent_color }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow shrink-0"
              style={{
                background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`,
              }}
            >
              <BrandLogoIcon
                iconName={branding.logo_icon_name}
                className="w-5 h-5 text-white"
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className={`text-lg sm:text-xl font-black text-white truncate leading-tight ${headingFontClass}`}
              >
                {state.organization.name}
              </h1>
              {isHighContrastDriveThru && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400 text-black flex items-center gap-1 shrink-0">
                  <Sun className="w-2.5 h-2.5" /> High Nits
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-300 truncate leading-tight">
              <span
                className="font-bold"
                style={{ color: branding.accent_color }}
              >
                {branding.tagline}
              </span>
              <span className="mx-1.5 opacity-50">•</span>
              <span className="text-zinc-400">
                {activeSchedule ? activeSchedule.name : 'Menú Todo el Día'}
              </span>
            </p>
          </div>
        </div>

        {/* Compact Single-Line TV Action Pills (Settings buttons auto-hide after 5s so the TV looks 100% clean!) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`flex items-center gap-1.5 transition-all duration-300 ${
              showHudControls || showAudioControlMenu
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none w-0 overflow-hidden'
            }`}
          >
            {/* 1-Click Test Video + Stereo Audio Button */}
            <button
              onClick={launchInstantTestVideoAndSound}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow transition cursor-pointer shrink-0"
              title="Reproducir Video de Prueba 16:9 con Sonido Estéreo"
            >
              <Film className="w-3 h-3" />
              <span>Video + Audio 75&quot;</span>
            </button>

            {/* 1-Click Layout Switcher (Split 70/30 + Video vs 3-Column Full Menu) */}
            <button
              onClick={() =>
                updateScreenConfig(activeScreen.id, {
                  layout_template:
                    effectiveLayout === 'split_promo'
                      ? 'classic_grid'
                      : 'split_promo',
                  orientation: 'landscape',
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition cursor-pointer shrink-0"
              title="Cambiar entre Vista 70/30 con Video o Carta de 3 Columnas"
            >
              <Tv className="w-3 h-3 text-amber-400" />
              <span>
                {effectiveLayout === 'split_promo'
                  ? '70/30 + Video'
                  : 'Carta 3 Cols'}
              </span>
            </button>

            {/* Image Fit Mode Toggle */}
            <button
              onClick={toggleImageFitMode}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition cursor-pointer shrink-0"
            >
              <span>
                {imageFitMode === 'contain' ? 'Fotos: Completas' : 'Fotos: 16:9'}
              </span>
            </button>

            {/* Overscan Safe Area Toggle */}
            <button
              onClick={cycleTvCalibrationMode}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-emerald-500/40 transition cursor-pointer shrink-0"
            >
              <span>
                📐{' '}
                {tvCalibrationMode === 'insignia_75_safe'
                  ? '75" Safe'
                  : tvCalibrationMode === 'insignia_75_compact'
                  ? '75" Anti-Corte'
                  : '100%'}
              </span>
            </button>

            {/* Audio Unmute / Independent Sound Control Popover */}
            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!browserAudioUnlocked) {
                    unlockAudioOnTV();
                  }
                  setShowAudioControlMenu((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                  activeScreen.audio_enabled && browserAudioUnlocked
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400 text-amber-300'
                }`}
                title="Controlar Audio del Video y Sonido de Recomendación del Chef"
              >
                {activeScreen.audio_enabled && browserAudioUnlocked ? (
                  <>
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>Audio {activeScreen.volume_percent}% ▾</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-amber-400" />
                    <span>Audio 🔊 ▾</span>
                  </>
                )}
              </button>

              {showAudioControlMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-9 z-50 w-72 rounded-2xl bg-zinc-950/95 border border-zinc-700 p-3.5 shadow-2xl backdrop-blur-xl space-y-2.5 text-left"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                      🎚️ Control de Sonido TV
                    </span>
                    <button
                      onClick={() => setShowAudioControlMenu(false)}
                      className="p-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Video Promo Audio Toggle */}
                  <button
                    onClick={() => {
                      setBrowserAudioUnlocked(true);
                      updateScreenConfig(activeScreen.id, {
                        audio_enabled: !activeScreen.audio_enabled,
                      });
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      activeScreen.audio_enabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {activeScreen.audio_enabled ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      Audio del Video Promo
                    </span>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black/40">
                      {activeScreen.audio_enabled ? 'ACTIVO' : 'SILENCIO'}
                    </span>
                  </button>

                  {/* 2. Chef Recommendation Chime Toggle */}
                  <button
                    onClick={() => {
                      setBrowserAudioUnlocked(true);
                      const nextVal = !activeScreen.chef_chime_enabled;
                      updateScreenConfig(activeScreen.id, {
                        chef_chime_enabled: nextVal,
                      });
                      if (nextVal) {
                        playChefRecommendationChime(
                          activeScreen.volume_percent || 80
                        );
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      activeScreen.chef_chime_enabled
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {activeScreen.chef_chime_enabled ? (
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      Sonido Recomendación Chef
                    </span>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black/40">
                      {activeScreen.chef_chime_enabled ? 'ACTIVO' : 'APAGADO'}
                    </span>
                  </button>

                  {/* 3. Flash Offer Chime Toggle */}
                  <button
                    onClick={() => {
                      setBrowserAudioUnlocked(true);
                      const nextVal = !activeScreen.flash_chime_enabled;
                      updateScreenConfig(activeScreen.id, {
                        flash_chime_enabled: nextVal,
                      });
                      if (nextVal) {
                        playPromoAttentionChime(
                          activeScreen.volume_percent || 80
                        );
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      activeScreen.flash_chime_enabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Campana Oferta Relámpago
                    </span>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black/40">
                      {activeScreen.flash_chime_enabled ? 'ACTIVO' : 'APAGADO'}
                    </span>
                  </button>

                  {/* 4. Master Volume Slider */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Volumen General TV</span>
                      <span className="font-mono font-bold text-white">
                        {activeScreen.volume_percent ?? 80}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={activeScreen.volume_percent ?? 80}
                      onChange={(e) =>
                        updateScreenConfig(activeScreen.id, {
                          volume_percent: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button to hide Silk Browser blue address bar */}
            {!embeddedMode && (
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-[11px] font-black shadow cursor-pointer shrink-0"
                title="Ocultar barra de direcciones del navegador del TV (Pantalla Completa)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
                <span>Full TV</span>
              </button>
            )}
          </div>

          {/* Clock */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border shrink-0"
            style={{
              backgroundColor: branding.surface_color,
              borderColor: `${branding.primary_color}45`,
            }}
          >
            <Clock
              className="w-3 h-3"
              style={{ color: branding.accent_color }}
            />
            <span className="text-xs font-bold font-mono text-white">
              {clockString}
            </span>
          </div>
        </div>
      </header>

      {/* SLEEK SINGLE-LINE FLASH PROMOTION BAR (AUTO-HIDES WHEN EXPIRED 00:00) */}
      {activeFlashPromo && !isPromoExpired && (
        <div
          className="relative z-20 text-white px-4 py-1.5 shadow-md border-b flex items-center justify-between gap-3 shrink-0"
          style={{
            background: `linear-gradient(90deg, ${branding.primary_color}, ${branding.accent_color})`,
            borderColor: branding.accent_color,
          }}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="px-2 py-0.5 rounded-full bg-black/50 border border-white/30 text-white text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" />
              {activeFlashPromo.badge_text}
            </span>
            <span
              className={`text-sm font-black uppercase truncate ${headingFontClass}`}
            >
              {activeFlashPromo.title}
            </span>
            <span className="hidden md:inline text-xs text-white/95 truncate">
              — {activeFlashPromo.subtitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeFlashPromo.special_price && (
              <div className="bg-black/45 px-2.5 py-0.5 rounded-lg border border-white/25 text-xs font-black">
                {state.organization.currency_symbol}
                {Number(activeFlashPromo.special_price).toFixed(2)}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-black/80 px-2.5 py-0.5 rounded-lg border border-white/30 text-xs font-mono font-black">
              <span className="text-[10px] text-zinc-300">FIN:</span>
              <span style={{ color: branding.accent_color }}>
                {promoCountdown}
              </span>
            </div>
            <button
              onClick={() => stopFlashPromotion(activeFlashPromo.id)}
              className="p-1 rounded-lg bg-black/50 hover:bg-black text-white/80 hover:text-white cursor-pointer"
              title="Ocultar barra de oferta"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN MULTI-ZONE MENU CONTENT (LOCKED TO 100% REMAINING 16:9 TV HEIGHT WITH ZERO BOTTOM CUTOFF) */}
      <main className="relative z-10 flex-1 min-h-0 px-2.5 py-1.5 overflow-hidden">
        {effectiveLayout === 'split_promo' ? (
          /* ===============================================================
             LAYOUT 1: WIDESCREEN 16:9 SPLIT (LEFT 67% MENU / RIGHT 33% VIDEO+PROMO)
             =============================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 h-full min-h-0 items-stretch">
            {/* Left 8 Cols: Top 2 Categories Side-by-Side + Bottom Horizontal Category Strip */}
            <div className="sm:col-span-8 flex flex-col justify-between gap-2 h-full min-h-0">
              {/* Top Row: First 2 Categories Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-h-0">
                {visibleCategories.slice(0, 2).map((category) => {
                  const catProducts = state.products
                    .filter((p) => p.category_id === category.id)
                    .sort((a, b) => a.sort_order - b.sort_order);

                  if (catProducts.length === 0) return null;

                  return (
                    <div
                      key={category.id}
                      className={`p-2.5 flex flex-col justify-between min-h-0 overflow-hidden ${getCategoryCardClasses(
                        branding.card_style
                      )}`}
                      style={{
                        backgroundColor: `${branding.surface_color}e6`,
                        borderColor: `${branding.primary_color}45`,
                      }}
                    >
                      <div
                        className="flex items-center justify-between border-b pb-1 mb-1.5 shrink-0"
                        style={{ borderColor: `${branding.primary_color}35` }}
                      >
                        <h2
                          className={`text-sm font-extrabold uppercase tracking-wide truncate ${headingFontClass}`}
                          style={{ color: branding.accent_color }}
                        >
                          {category.name}
                        </h2>
                        <span className="text-[9px] text-zinc-400 shrink-0 ml-2">
                          {catProducts.filter((p) => p.is_available).length} disp.
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-around gap-1 min-h-0">
                        {catProducts.map((product) => (
                          <MenuProductRow
                            key={product.id}
                            product={product}
                            currency={state.organization.currency_symbol}
                            showCalories={
                              state.organization.fda_calorie_compliance
                            }
                            highContrast={isHighContrastDriveThru}
                            branding={branding}
                            headingFontClass={headingFontClass}
                            imageFitMode={imageFitMode}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Row: 3rd (and 4th) Category as Horizontal Full-Width Strip so NOTHING gets cut off below the TV! */}
              {visibleCategories.length > 2 && (
                <div
                  className={`grid gap-2.5 shrink-0 ${
                    visibleCategories.length >= 4
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1'
                  }`}
                >
                  {visibleCategories.slice(2, 4).map((category) => {
                    const catProducts = state.products
                      .filter((p) => p.category_id === category.id)
                      .sort((a, b) => a.sort_order - b.sort_order);

                    if (catProducts.length === 0) return null;

                    return (
                      <div
                        key={category.id}
                        className={`px-3 py-2 ${getCategoryCardClasses(
                          branding.card_style
                        )}`}
                        style={{
                          backgroundColor: `${branding.surface_color}e6`,
                          borderColor: `${branding.primary_color}45`,
                        }}
                      >
                        <div
                          className="flex items-center justify-between border-b pb-1 mb-1.5"
                          style={{ borderColor: `${branding.primary_color}35` }}
                        >
                          <h2
                            className={`text-xs font-extrabold uppercase tracking-wide truncate ${headingFontClass}`}
                            style={{ color: branding.accent_color }}
                          >
                            {category.name}
                          </h2>
                          <span className="text-[9px] text-zinc-400">
                            {catProducts.filter((p) => p.is_available).length}{' '}
                            opciones
                          </span>
                        </div>

                        <div
                          className={`grid gap-2 ${
                            visibleCategories.length === 3
                              ? 'grid-cols-1 sm:grid-cols-3'
                              : 'grid-cols-1 sm:grid-cols-2'
                          }`}
                        >
                          {catProducts.slice(0, 3).map((product) => (
                            <MenuProductRow
                              key={product.id}
                              product={product}
                              currency={state.organization.currency_symbol}
                              showCalories={
                                state.organization.fda_calorie_compliance
                              }
                              highContrast={isHighContrastDriveThru}
                              branding={branding}
                              headingFontClass={headingFontClass}
                              imageFitMode={imageFitMode}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 4 Cols: Flex-1 16:9 Media Frame + Compact Chef Card + Compact Upsell Card (Guaranteed to fit in 100vh) */}
            <div className="sm:col-span-4 flex flex-col justify-between gap-2 h-full min-h-0">
              {/* 1. DYNAMIC 16:9 MEDIA FRAME (FLEX-1 SO IT ADAPTS TO EXACT REMAINING HEIGHT) */}
              <div
                className="w-full flex-1 min-h-[140px] rounded-2xl overflow-hidden border-2 relative shadow-xl bg-zinc-950"
                style={{
                  borderColor: `${branding.accent_color}90`,
                }}
              >
                {showSideVideoLoop && activeVideoUrl ? (
                  <video
                    key={`side-vid-${activeScreen.id}-${activeVideoUrl}`}
                    ref={attachSideVideoRef}
                    src={activeVideoUrl}
                    poster={currentFeaturedProduct?.image_url}
                    preload="auto"
                    autoPlay
                    loop
                    playsInline
                    muted={!(activeScreen.audio_enabled && browserAudioUnlocked)}
                    onLoadedData={(e) => {
                      const vid = e.currentTarget;
                      vid.defaultMuted = true;
                      vid.volume = Math.max(
                        0,
                        Math.min(1, (activeScreen.volume_percent || 80) / 100)
                      );
                      vid.muted = !(
                        activeScreen.audio_enabled && browserAudioUnlocked
                      );
                      vid.play().catch(() => {
                        vid.defaultMuted = true;
                        vid.muted = true;
                        vid.play().catch(() => {});
                      });
                    }}
                    onCanPlay={(e) => {
                      const vid = e.currentTarget;
                      if (vid.paused) {
                        vid.play().catch(() => {
                          vid.defaultMuted = true;
                          vid.muted = true;
                          vid.play().catch(() => {});
                        });
                      }
                    }}
                    className={`w-full h-full ${
                      imageFitMode === 'contain'
                        ? 'object-contain bg-black'
                        : 'object-fill'
                    }`}
                  />
                ) : (
                  currentFeaturedProduct && (
                    <img
                      src={currentFeaturedProduct.image_url}
                      alt={currentFeaturedProduct.name}
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80';
                      }}
                      className={`w-full h-full transition-all duration-700 ${
                        imageFitMode === 'contain'
                          ? 'object-contain bg-zinc-950'
                          : 'object-cover object-center'
                      }`}
                    />
                  )
                )}

                {/* Top Overlay Controls inside 16:9 Frame (Auto-hides after 5s on TV so video looks 100% clean) */}
                <div
                  className={`absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-1 transition-opacity duration-300 ${
                    showHudControls || showAudioControlMenu
                      ? 'opacity-100'
                      : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateScreenConfig(activeScreen.id, {
                        video_mode: showSideVideoLoop
                          ? 'disabled'
                          : 'side_zone_loop',
                      });
                    }}
                    className="px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: branding.primary_color }}
                    title="Alternar entre Video en Bucle o Foto Destacada"
                  >
                    <Film className="w-3 h-3" />
                    {showSideVideoLoop ? 'Video Promo 16:9' : 'Activar Video'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        launchInstantTestVideoAndSound();
                      }}
                      className="px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-black shadow cursor-pointer"
                    >
                      ▶ Spot 12s
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!browserAudioUnlocked) {
                          unlockAudioOnTV();
                        } else {
                          updateScreenConfig(activeScreen.id, {
                            audio_enabled: !activeScreen.audio_enabled,
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded-full bg-black/80 border border-white/25 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer hover:bg-black"
                    >
                      {activeScreen.audio_enabled && browserAudioUnlocked ? (
                        <>
                          <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>{activeScreen.volume_percent}%</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3 h-3 text-amber-400" />
                          <span>Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. COMPACT FEATURED DISH SHOWCASE CARD (SHRINK-0) */}
              {currentFeaturedProduct && (
                <div
                  className="rounded-2xl border p-2.5 shadow-lg flex flex-col justify-between gap-1.5 shrink-0"
                  style={{
                    backgroundColor: `${branding.surface_color}f2`,
                    borderColor: `${branding.accent_color}55`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={currentFeaturedProduct.image_url}
                      alt={currentFeaturedProduct.name}
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80';
                      }}
                      className="w-12 h-12 rounded-xl object-cover object-center shrink-0 border shadow bg-zinc-900"
                      style={{ borderColor: branding.accent_color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-white text-[8px] font-extrabold uppercase tracking-wider shrink-0"
                          style={{ backgroundColor: branding.primary_color }}
                        >
                          ★ Recomendación del Chef
                        </span>
                        {(showHudControls || showAudioControlMenu) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBrowserAudioUnlocked(true);
                              const nextVal = !activeScreen.chef_chime_enabled;
                              updateScreenConfig(activeScreen.id, {
                                chef_chime_enabled: nextVal,
                              });
                              if (nextVal) {
                                playChefRecommendationChime(
                                  activeScreen.volume_percent || 80
                                );
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border flex items-center gap-0.5 cursor-pointer transition shrink-0 ${
                              activeScreen.chef_chime_enabled
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                            }`}
                            title="Activar o silenciar campanita al cambiar Recomendación del Chef"
                          >
                            {activeScreen.chef_chime_enabled ? (
                              <>
                                <Bell className="w-2.5 h-2.5 text-amber-400" />
                                <span>Sonido ON</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-2.5 h-2.5 text-zinc-500" />
                                <span>Silencio</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <h3
                        className={`text-sm font-black text-white leading-tight truncate mt-0.5 ${headingFontClass}`}
                      >
                        {currentFeaturedProduct.name}
                      </h3>
                      <p className="text-[10px] text-zinc-300 line-clamp-1 leading-tight">
                        {currentFeaturedProduct.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0 pl-2 flex flex-col items-end justify-center">
                      <div className="flex items-baseline justify-end gap-1">
                        {currentFeaturedProduct.promo_price && (
                          <span className="text-[10px] text-zinc-400 line-through">
                            {state.organization.currency_symbol}
                            {currentFeaturedProduct.price.toFixed(2)}
                          </span>
                        )}
                        <span
                          className={`text-lg font-black leading-none ${headingFontClass}`}
                          style={{ color: branding.accent_color }}
                        >
                          {state.organization.currency_symbol}
                          {(
                            currentFeaturedProduct.promo_price ??
                            currentFeaturedProduct.price
                          ).toFixed(2)}
                        </span>
                      </div>
                      {state.organization.fda_calorie_compliance && (
                        <span className="text-[9px] font-bold text-zinc-400 leading-tight mt-0.5">
                          {currentFeaturedProduct.calories} Cal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. COMPACT SECONDARY UPSELL CARD (SHRINK-0) */}
              {branding.promo_upsell_Enabled && (
                <div
                  className="rounded-2xl border px-3 py-2 flex items-center justify-between gap-2 shadow-lg shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${branding.surface_color}, ${branding.primary_color}30)`,
                    borderColor: `${branding.primary_color}60`,
                  }}
                >
                  <div className="min-w-0">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest block leading-tight"
                      style={{ color: branding.accent_color }}
                    >
                      {branding.promo_upsell_badge}
                    </span>
                    <h4
                      className={`text-xs font-extrabold text-white truncate leading-tight ${headingFontClass}`}
                    >
                      {branding.promo_upsell_title}
                    </h4>
                    <p className="text-[10px] text-zinc-300 line-clamp-1 leading-tight">
                      {branding.promo_upsell_subtitle}
                    </p>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-xl text-zinc-950 font-black text-sm shrink-0 shadow"
                    style={{ backgroundColor: branding.accent_color }}
                  >
                    {branding.promo_upsell_price_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : effectiveLayout === 'portrait_totem' ? (
          /* ===============================================================
             LAYOUT 2: PORTRAIT TOTEM 9:16 (WITH TOP VIDEO PROMO BANNER)
             =============================================================== */
          <div className="max-w-xl mx-auto space-y-6">
            {showSideVideoLoop && activeVideoUrl ? (
              <div
                className="rounded-3xl overflow-hidden border-2 relative h-72 flex flex-col justify-between p-5"
                style={{ borderColor: branding.accent_color }}
              >
                <video
                  key={`portrait-vid-${activeScreen.id}-${activeVideoUrl}`}
                  ref={attachSideVideoRef}
                  src={activeVideoUrl}
                  preload="auto"
                  autoPlay
                  loop
                  playsInline
                  muted={!(activeScreen.audio_enabled && browserAudioUnlocked)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="relative z-10 flex items-center justify-between">
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase text-white flex items-center gap-1"
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    <Film className="w-3 h-3" /> Video Promo
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-black/70 text-[11px] font-bold text-amber-300">
                    {activeScreen.audio_enabled
                      ? `🔊 Audio ${activeScreen.volume_percent}%`
                      : '🔇 Silencio'}
                  </span>
                </div>
                {currentFeaturedProduct && (
                  <div className="relative z-10 w-full flex items-end justify-between">
                    <div>
                      <div
                        className="text-xs font-bold uppercase"
                        style={{ color: branding.accent_color }}
                      >
                        {activeScreen.promo_video_title}
                      </div>
                      <h3
                        className={`text-2xl font-black text-white mt-0.5 ${headingFontClass}`}
                      >
                        {currentFeaturedProduct.name}
                      </h3>
                    </div>
                    <div
                      className="text-3xl font-black"
                      style={{ color: branding.accent_color }}
                    >
                      {state.organization.currency_symbol}
                      {(
                        currentFeaturedProduct.promo_price ??
                        currentFeaturedProduct.price
                      ).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              currentFeaturedProduct && (
                <div
                  className="rounded-3xl overflow-hidden border-2 relative h-64 flex items-end p-6"
                  style={{ borderColor: branding.accent_color }}
                >
                  <img
                    src={currentFeaturedProduct.image_url}
                    alt={currentFeaturedProduct.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="relative z-10 w-full flex items-end justify-between">
                    <div>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase text-white"
                        style={{ backgroundColor: branding.primary_color }}
                      >
                        Destacado del Día
                      </span>
                      <h3
                        className={`text-2xl font-black text-white mt-1 ${headingFontClass}`}
                      >
                        {currentFeaturedProduct.name}
                      </h3>
                      {state.organization.fda_calorie_compliance && (
                        <span className="text-xs text-zinc-300 font-semibold">
                          {currentFeaturedProduct.calories} Cal
                        </span>
                      )}
                    </div>
                    <div
                      className="text-3xl font-black"
                      style={{ color: branding.accent_color }}
                    >
                      {state.organization.currency_symbol}
                      {(
                        currentFeaturedProduct.promo_price ??
                        currentFeaturedProduct.price
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )
            )}

            {visibleCategories.map((category) => {
              const catProducts = state.products
                .filter((p) => p.category_id === category.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              if (catProducts.length === 0) return null;

              return (
                <div
                  key={category.id}
                  className={`p-5 ${getCategoryCardClasses(
                    branding.card_style
                  )}`}
                  style={{
                    backgroundColor: `${branding.surface_color}e6`,
                    borderColor: `${branding.primary_color}45`,
                  }}
                >
                  <h2
                    className={`text-lg font-black uppercase border-b pb-2 mb-3 ${headingFontClass}`}
                    style={{
                      color: branding.accent_color,
                      borderColor: `${branding.primary_color}35`,
                    }}
                  >
                    {category.name}
                  </h2>
                  <div className="space-y-3">
                    {catProducts.map((product) => (
                      <MenuProductRow
                        key={product.id}
                        product={product}
                        currency={state.organization.currency_symbol}
                        showCalories={state.organization.fda_calorie_compliance}
                        highContrast={isHighContrastDriveThru}
                        branding={branding}
                        headingFontClass={headingFontClass}
                        imageFitMode={imageFitMode}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ===============================================================
             LAYOUT 3: CLASSIC 3-COLUMN QSR GRID / DRIVE-THRU HIGH CONTRAST
             Uses sm:grid-cols-3 (640px+) so Fire TV 960x540 renders 3 columns side-by-side!
             =============================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {visibleCategories.map((category) => {
              const catProducts = state.products
                .filter((p) => p.category_id === category.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              if (catProducts.length === 0) return null;

              return (
                <div
                  key={category.id}
                  className={`p-3.5 ${getCategoryCardClasses(
                    branding.card_style
                  )}`}
                  style={{
                    backgroundColor: isHighContrastDriveThru
                      ? '#09090b'
                      : `${branding.surface_color}e6`,
                    borderColor: isHighContrastDriveThru
                      ? branding.accent_color
                      : `${branding.primary_color}45`,
                  }}
                >
                  <div
                    className="border-b pb-1.5 mb-2.5 flex items-center justify-between"
                    style={{ borderColor: `${branding.primary_color}35` }}
                  >
                    <h2
                      className={`text-base font-black uppercase ${headingFontClass}`}
                      style={{ color: branding.accent_color }}
                    >
                      {category.name}
                    </h2>
                    <span className="text-[10px] text-zinc-400">
                      {catProducts.filter((p) => p.is_available).length} platos
                    </span>
                  </div>
                  <div className="space-y-2">
                    {catProducts.map((product) => (
                      <MenuProductRow
                        key={product.id}
                        product={product}
                        currency={state.organization.currency_symbol}
                        showCalories={state.organization.fda_calorie_compliance}
                        highContrast={isHighContrastDriveThru}
                        branding={branding}
                        headingFontClass={headingFontClass}
                        imageFitMode={imageFitMode}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CUSTOM BRAND FOOTER + MANDATORY FDA CALORIE COMPLIANCE (21 CFR 101.11) — COMPACT 1-LINE BAR */}
      <footer
        className="relative z-10 px-3 py-1 border-t flex items-center justify-between gap-2 text-[9px] text-zinc-300 shrink-0"
        style={{
          backgroundColor: `${branding.background_color}f2`,
          borderColor: `${branding.primary_color}40`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {branding.custom_footer_text && (
            <span
              className="font-bold truncate"
              style={{ color: branding.accent_color }}
            >
              ★ {branding.custom_footer_text}
            </span>
          )}
          {branding.show_prices_with_tax_note && (
            <span className="text-zinc-400 shrink-0">
              • {branding.show_prices_with_tax_note}
            </span>
          )}
          {state.organization.fda_calorie_compliance && (
            <span className="text-zinc-400 truncate hidden sm:inline">
              • <strong>FDA:</strong> 2,000 calorías/día se usan como guía general; información nutricional escrita disponible a solicitud.
            </span>
          )}
        </div>
        <div className="text-zinc-400 font-mono shrink-0">
          {state.organization.name} • {activeScreen.pairing_code}
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// PRODUCT ITEM ROW WITH BRAND STYLING, SMOOTH 86-ING & FDA CALORIE PROMINENCE
// ============================================================================
const MenuProductRow: React.FC<{
  product: Product;
  currency: string;
  showCalories: boolean;
  highContrast: boolean;
  branding: OrganizationBranding;
  headingFontClass: string;
  imageFitMode?: 'cover' | 'contain';
}> = ({
  product,
  currency,
  showCalories,
  highContrast,
  branding,
  headingFontClass,
  imageFitMode = 'cover',
}) => {
  const isSoldOut = !product.is_available;
  const activePrice = product.promo_price ?? product.price;

  return (
    <div
      className={`group flex items-center gap-2.5 px-2 py-1 rounded-xl transition-all duration-300 ${
        isSoldOut
          ? 'opacity-45 bg-black/50 border border-red-900/40 grayscale'
          : highContrast
          ? 'bg-zinc-900/90 border border-zinc-800'
          : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      {branding.show_product_images && (
        <div
          className="relative w-12 h-11 rounded-xl overflow-hidden shrink-0 bg-zinc-950 border shadow"
          style={{ borderColor: `${branding.primary_color}55` }}
        >
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80';
            }}
            className={`w-full h-full ${
              imageFitMode === 'contain'
                ? 'object-contain bg-zinc-950'
                : 'object-cover object-center'
            }`}
          />
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
              <span className="text-[8px] font-black uppercase tracking-tighter text-red-400 border border-red-500/60 px-1 rounded bg-red-950/90">
                86&apos;d
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Full Dish Name on its own line so it NEVER gets truncated by the badge */}
            <h3
              className={`font-extrabold text-[13px] leading-tight truncate ${headingFontClass} ${
                isSoldOut ? 'line-through text-zinc-400' : 'text-white'
              }`}
            >
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {!isSoldOut &&
                product.tags?.slice(0, 1).map((tag) => (
                  <span
                    key={tag}
                    className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase border shrink-0 leading-tight"
                    style={{
                      backgroundColor: `${branding.primary_color}25`,
                      color: branding.accent_color,
                      borderColor: `${branding.primary_color}50`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              <p className="text-[10px] text-zinc-300/90 truncate leading-tight">
                {product.description}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-1">
            <div className="flex items-baseline justify-end gap-1">
              {product.promo_price && !isSoldOut && (
                <span className="text-[9px] text-zinc-400 line-through">
                  {currency}
                  {product.price.toFixed(2)}
                </span>
              )}
              <span
                className={`text-base font-black leading-none ${headingFontClass}`}
                style={{
                  color: isSoldOut
                    ? '#71717a'
                    : product.promo_price
                    ? '#34d399'
                    : branding.accent_color,
                }}
              >
                {currency}
                {activePrice.toFixed(2)}
              </span>
            </div>

            {showCalories && (
              <div className="text-[9px] font-bold text-zinc-400 leading-tight mt-0.5">
                {product.calories} Cal
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
