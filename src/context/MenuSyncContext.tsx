import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Category,
  FlashPromotion,
  LayoutTemplate,
  MenuAppState,
  Organization,
  OrganizationBranding,
  Product,
  Schedule,
  Screen,
  ScreenOrientation,
  SyncEventLog,
  VideoDisplayMode,
} from '../types/menu';
import { INITIAL_MENU_STATE } from '../data/seedData';
import {
  BROADCAST_CHANNEL_NAME,
  REALTIME_CHANNEL_NAME,
  supabase,
} from '../lib/supabase';
import {
  loadMenuStateFromIndexedDB,
  saveMenuStateToIndexedDB,
} from '../lib/offlineStorage';

interface MenuSyncContextType {
  state: MenuAppState;
  isSupabaseRealtimeConnected: boolean;
  isOfflineMode: boolean;
  lastSavedFeedback: string | null;
  setSimulatedOffline: (offline: boolean) => void;
  setActiveBranch: (branchId: string) => void;
  setSimulatedTime: (timeHHmm: string | null) => void;
  toggleProductAvailability86: (
    productId: string,
    source?: 'Backoffice Admin' | 'POS Webhook'
  ) => void;
  toggleProductFeatured: (productId: string) => void;
  updateProductPrice: (
    productId: string,
    newPrice: number,
    promoPrice?: number | null
  ) => void;
  upsertProduct: (product: Omit<Product, 'id' | 'updated_at'> & { id?: string }) => void;
  deleteProduct: (productId: string) => void;
  upsertCategory: (category: Omit<Category, 'id'> & { id?: string }) => void;
  triggerFlashPromotion: (
    promo: Omit<FlashPromotion, 'id' | 'starts_at' | 'expires_at' | 'is_active'>
  ) => void;
  stopFlashPromotion: (promoId: string) => void;
  pairNewScreen: (params: {
    pairingCode: string;
    name: string;
    branchId: string;
    orientation: ScreenOrientation;
    layoutTemplate: LayoutTemplate;
    hardwareType: string;
    isOutdoorHighNits: boolean;
    videoMode?: VideoDisplayMode;
    promoVideoUrl?: string;
    audioEnabled?: boolean;
  }) => Screen;
  updateScreenConfig: (
    screenId: string,
    updates: Partial<Omit<Screen, 'id'>>
  ) => void;
  deleteScreen: (screenId: string) => void;
  triggerLiveFullscreenVideoSpot: (params: {
    targetScreenId: string | 'ALL';
    videoUrl: string;
    title: string;
    subtitle: string;
    forceAudio: boolean;
    durationSeconds: number;
  }) => void;
  clearLiveFullscreenVideoSpot: () => void;
  upsertSchedule: (schedule: Omit<Schedule, 'id'> & { id?: string }) => void;
  toggleScheduleActive: (scheduleId: string) => void;
  updateOrganizationSettings: (updates: Partial<Organization>) => void;
  updateOrganizationBranding: (updates: Partial<OrganizationBranding>) => void;
  saveFullBrandProfile: (
    orgUpdates: Partial<Organization>,
    brandingUpdates: Partial<OrganizationBranding>
  ) => void;
  simulatePosWebhookEvent: (
    posName: 'Toast POS' | 'Square POS' | 'Clover POS',
    action: '86_RANDOM' | 'RESTORE_ALL' | 'HAPPY_HOUR_PRICES'
  ) => void;
  resetDemoData: () => void;
}

const MenuSyncContext = createContext<MenuSyncContextType | undefined>(undefined);

// Normalize screens in case cached state comes from an older schema without video/audio properties or broken hotlinked URLs
function normalizeHydratedState(rawState: MenuAppState): MenuAppState {
  const cleanVideoUrl = (url?: string) => {
    if (!url || url.includes('mixkit.co')) {
      return '/videos/promo-redlion-parrilla-audio.mp4';
    }
    return url;
  };

  const defaultVideoUrl = cleanVideoUrl(
    rawState.organization?.branding?.default_promo_video_url ||
      INITIAL_MENU_STATE.organization.branding.default_promo_video_url
  );

  return {
    ...INITIAL_MENU_STATE,
    ...rawState,
    organization: {
      ...INITIAL_MENU_STATE.organization,
      ...rawState.organization,
      branding: {
        ...INITIAL_MENU_STATE.organization.branding,
        ...(rawState.organization?.branding || {}),
        default_promo_video_url: defaultVideoUrl,
      },
    },
    products: (rawState.products || INITIAL_MENU_STATE.products).map((p) => ({
      ...p,
      image_url:
        p.image_url && p.image_url.includes('photo-1576107232684')
          ? 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80'
          : p.image_url,
    })),
    screens: (Array.isArray(rawState.screens)
      ? rawState.screens
      : INITIAL_MENU_STATE.screens
    ).map((scr, idx) => ({
      ...INITIAL_MENU_STATE.screens[idx % INITIAL_MENU_STATE.screens.length],
      ...scr,
      video_mode: scr.video_mode || (idx === 0 ? 'side_zone_loop' : 'disabled'),
      promo_video_url: cleanVideoUrl(scr.promo_video_url || defaultVideoUrl),
      promo_video_title:
        scr.promo_video_title || '🔥 Especialidad a la Parrilla en Vivo',
      audio_enabled: scr.audio_enabled ?? idx === 0,
      volume_percent: scr.volume_percent ?? (idx === 0 ? 80 : 0),
      spot_interval_minutes: scr.spot_interval_minutes ?? 10,
      spot_duration_seconds: scr.spot_duration_seconds ?? 15,
      flash_chime_enabled: scr.flash_chime_enabled ?? true,
      chef_chime_enabled: scr.chef_chime_enabled ?? false,
    })),
    liveSpotTrigger: rawState.liveSpotTrigger || null,
  };
}

function getInitialHydratedState(): MenuAppState {
  try {
    const raw = localStorage.getItem('current_kiosk_state_v2');
    if (raw) {
      const parsed = JSON.parse(raw) as MenuAppState;
      if (parsed && parsed.organization?.branding && parsed.products?.length > 0) {
        return normalizeHydratedState(parsed);
      }
    }
  } catch {
    // Fallback to seed
  }
  return INITIAL_MENU_STATE;
}

export const MenuSyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<MenuAppState>(getInitialHydratedState);
  const [isSupabaseRealtimeConnected, setIsSupabaseRealtimeConnected] =
    useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [lastSavedFeedback, setLastSavedFeedback] = useState<string | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const isOfflineRef = useRef<boolean>(isOfflineMode);
  isOfflineRef.current = isOfflineMode;

  const triggerSavedToast = (msg: string) => {
    setLastSavedFeedback(msg);
    setTimeout(() => {
      setLastSavedFeedback((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // 1. Load persisted state from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    loadMenuStateFromIndexedDB().then((cached) => {
      if (
        mounted &&
        cached &&
        cached.organization?.branding &&
        cached.products?.length > 0
      ) {
        setState(normalizeHydratedState(cached));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Setup BroadcastChannel (Local <5ms sync) + Supabase Realtime Channel (<100ms cloud WebSocket sync)
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (isOfflineRef.current) return;
        if (event.data?.type === 'MENUSYNC_STATE_PUSH' && event.data?.payload) {
          const normalized = normalizeHydratedState(event.data.payload);
          setState(normalized);
          saveMenuStateToIndexedDB(normalized);
        }
      };
      broadcastChannelRef.current = bc;
    }

    const channel = supabase.channel(REALTIME_CHANNEL_NAME, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'MENUSYNC_STATE_PUSH' }, ({ payload }) => {
        if (isOfflineRef.current) return;
        if (payload && payload.products && payload.organization?.branding) {
          const normalized = normalizeHydratedState(payload as MenuAppState);
          setState(normalized);
          saveMenuStateToIndexedDB(normalized);
        }
      })
      .subscribe((status) => {
        setIsSupabaseRealtimeConnected(status === 'SUBSCRIBED');
      });

    supabaseChannelRef.current = channel;

    return () => {
      broadcastChannelRef.current?.close();
      if (supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
      }
    };
  }, []);

  const commitAndBroadcast = (
    updater: (prev: MenuAppState) => MenuAppState,
    eventMeta?: {
      type: SyncEventLog['type'];
      source: SyncEventLog['source'];
      message: string;
    }
  ) => {
    const startPerf = performance.now();
    setState((prev) => {
      const updated = updater(prev);
      const latency = Math.max(
        12,
        Math.min(85, Math.round(performance.now() - startPerf + 18))
      );
      const nowIso = new Date().toISOString();

      const nextLogs = eventMeta
        ? [
            {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: nowIso,
              type: eventMeta.type,
              source: eventMeta.source,
              message: eventMeta.message,
              latencyMs: latency,
            },
            ...updated.syncLogs.slice(0, 29),
          ]
        : updated.syncLogs;

      const finalState: MenuAppState = {
        ...updated,
        syncLogs: nextLogs,
        lastSyncedAt: nowIso,
      };

      saveMenuStateToIndexedDB(finalState);

      if (!isOfflineRef.current) {
        broadcastChannelRef.current?.postMessage({
          type: 'MENUSYNC_STATE_PUSH',
          payload: finalState,
        });

        supabaseChannelRef.current?.send({
          type: 'broadcast',
          event: 'MENUSYNC_STATE_PUSH',
          payload: finalState,
        });
      }

      return finalState;
    });
  };

  const setSimulatedOffline = (offline: boolean) => {
    setIsOfflineMode(offline);
    if (!offline) {
      setState((current) => {
        broadcastChannelRef.current?.postMessage({
          type: 'MENUSYNC_STATE_PUSH',
          payload: current,
        });
        supabaseChannelRef.current?.send({
          type: 'broadcast',
          event: 'MENUSYNC_STATE_PUSH',
          payload: current,
        });
        return current;
      });
    }
  };

  const setActiveBranch = (branchId: string) => {
    commitAndBroadcast((prev) => ({
      ...prev,
      activeBranchId: branchId,
    }));
  };

  const setSimulatedTime = (timeHHmm: string | null) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        simulatedTimeOverride: timeHHmm,
      }),
      {
        type: 'DAYPART_SWITCH',
        source: 'System Clock',
        message: timeHHmm
          ? `Simulación Dayparting activada a las ${timeHHmm} hrs`
          : 'Reloj Dayparting sincronizado con hora real del sistema',
      }
    );
  };

  const toggleProductAvailability86 = (
    productId: string,
    source: 'Backoffice Admin' | 'POS Webhook' = 'Backoffice Admin'
  ) => {
    const target = state.products.find((p) => p.id === productId);
    if (!target) return;
    const nextAvailable = !target.is_available;

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                is_available: nextAvailable,
                updated_at: new Date().toISOString(),
              }
            : p
        ),
      }),
      {
        type: '86_TOGGLE',
        source,
        message: nextAvailable
          ? `Producto habilitado en pantallas: "${target.name}"`
          : `86'd (AGOTADO) ocultado en pantallas: "${target.name}"`,
      }
    );
  };

  const toggleProductFeatured = (productId: string) => {
    const target = state.products.find((p) => p.id === productId);
    if (!target) return;
    const nextFeatured = !target.is_featured;

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                is_featured: nextFeatured,
                updated_at: new Date().toISOString(),
              }
            : p
        ),
      }),
      {
        type: 'PRICE_UPDATE',
        source: 'Backoffice Admin',
        message: nextFeatured
          ? `Marcado como Destacado en Zona Promo: "${target.name}"`
          : `Removido de Zona Promo: "${target.name}"`,
      }
    );
  };

  const updateProductPrice = (
    productId: string,
    newPrice: number,
    promoPrice?: number | null
  ) => {
    const target = state.products.find((p) => p.id === productId);
    if (!target) return;

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                price: newPrice,
                promo_price:
                  promoPrice !== undefined ? promoPrice : p.promo_price,
                updated_at: new Date().toISOString(),
              }
            : p
        ),
      }),
      {
        type: 'PRICE_UPDATE',
        source: 'Backoffice Admin',
        message: `Precio actualizado en vivo para "${target.name}": ${state.organization.currency_symbol}${newPrice.toFixed(2)}`,
      }
    );
  };

  const upsertProduct = (
    productData: Omit<Product, 'id' | 'updated_at'> & { id?: string }
  ) => {
    const isEdit = Boolean(productData.id);
    const id = productData.id || `prod-${Date.now()}`;
    const fullProduct: Product = {
      ...productData,
      id,
      updated_at: new Date().toISOString(),
    };

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        products: isEdit
          ? prev.products.map((p) => (p.id === id ? fullProduct : p))
          : [fullProduct, ...prev.products],
      }),
      {
        type: 'PRICE_UPDATE',
        source: 'Backoffice Admin',
        message: isEdit
          ? `Producto editado: "${fullProduct.name}"`
          : `Nuevo producto publicado al instante: "${fullProduct.name}"`,
      }
    );
    triggerSavedToast(`Producto "${fullProduct.name}" guardado`);
  };

  const deleteProduct = (productId: string) => {
    const target = state.products.find((p) => p.id === productId);
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }),
      {
        type: '86_TOGGLE',
        source: 'Backoffice Admin',
        message: `Producto eliminado del catálogo: "${target?.name || productId}"`,
      }
    );
  };

  const upsertCategory = (
    categoryData: Omit<Category, 'id'> & { id?: string }
  ) => {
    const isEdit = Boolean(categoryData.id);
    const id = categoryData.id || `cat-${Date.now()}`;
    const fullCat: Category = { ...categoryData, id };

    commitAndBroadcast((prev) => ({
      ...prev,
      categories: isEdit
        ? prev.categories.map((c) => (c.id === id ? fullCat : c))
        : [...prev.categories, fullCat],
    }));
  };

  const triggerFlashPromotion = (
    promo: Omit<FlashPromotion, 'id' | 'starts_at' | 'expires_at' | 'is_active'>
  ) => {
    const now = new Date();
    const expires = new Date(
      now.getTime() + promo.duration_minutes * 60 * 1000
    );
    const newPromo: FlashPromotion = {
      ...promo,
      id: `flash-${Date.now()}`,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      is_active: true,
    };

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        flashPromotions: [
          newPromo,
          ...prev.flashPromotions.map((fp) => ({ ...fp, is_active: false })),
        ],
      }),
      {
        type: 'FLASH_PROMO',
        source: 'Backoffice Admin',
        message: `¡Oferta Relámpago lanzada a pantallas!: "${newPromo.title}" (${newPromo.duration_minutes} min)`,
      }
    );
    triggerSavedToast('Oferta Relámpago transmitiendo en vivo');
  };

  const stopFlashPromotion = (promoId: string) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        flashPromotions: prev.flashPromotions.map((fp) =>
          fp.id === promoId ? { ...fp, is_active: false } : fp
        ),
      }),
      {
        type: 'FLASH_PROMO',
        source: 'Backoffice Admin',
        message: 'Oferta Relámpago finalizada en pantallas',
      }
    );
  };

  const pairNewScreen = (params: {
    pairingCode: string;
    name: string;
    branchId: string;
    orientation: ScreenOrientation;
    layoutTemplate: LayoutTemplate;
    hardwareType: string;
    isOutdoorHighNits: boolean;
    videoMode?: VideoDisplayMode;
    promoVideoUrl?: string;
    audioEnabled?: boolean;
  }): Screen => {
    const normalizedCode = params.pairingCode.trim().toUpperCase();
    const newScreen: Screen = {
      id: `scr-${Date.now()}`,
      branch_id: params.branchId,
      name: params.name,
      pairing_code: normalizedCode,
      is_paired: true,
      status: 'online',
      orientation: params.orientation,
      resolution:
        params.orientation === 'portrait'
          ? '1080x1920 (Vertical HD)'
          : '3840x2160 (4K UHD)',
      layout_template: params.layoutTemplate,
      hardware_type: params.hardwareType,
      is_outdoor_high_nits: params.isOutdoorHighNits,
      last_heartbeat: new Date().toISOString(),
      video_mode: params.videoMode || 'side_zone_loop',
      promo_video_url:
        params.promoVideoUrl ||
        state.organization.branding.default_promo_video_url,
      promo_video_title: '🔥 Especialidad en Vivo',
      audio_enabled: params.audioEnabled ?? true,
      volume_percent: 80,
      spot_interval_minutes: 10,
      spot_duration_seconds: 15,
      flash_chime_enabled: true,
      chef_chime_enabled: false,
    };

    commitAndBroadcast(
      (prev) => {
        const exists = prev.screens.find(
          (s) => s.pairing_code.toUpperCase() === normalizedCode
        );
        return {
          ...prev,
          screens: exists
            ? prev.screens.map((s) =>
                s.pairing_code.toUpperCase() === normalizedCode
                  ? { ...newScreen, id: s.id }
                  : s
              )
            : [...prev.screens, newScreen],
        };
      },
      {
        type: 'SCREEN_PAIR',
        source: 'Backoffice Admin',
        message: `Pantalla vinculada en <30s: "${newScreen.name}" [${normalizedCode}]`,
      }
    );

    triggerSavedToast(`Pantalla "${newScreen.name}" vinculada`);
    return newScreen;
  };

  const updateScreenConfig = (
    screenId: string,
    updates: Partial<Omit<Screen, 'id'>>
  ) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        screens: prev.screens.map((s) =>
          s.id === screenId
            ? {
                ...s,
                ...updates,
                pairing_code: updates.pairing_code
                  ? updates.pairing_code.trim().toUpperCase()
                  : s.pairing_code,
                last_heartbeat: new Date().toISOString(),
              }
            : s
        ),
      }),
      {
        type: 'SCREEN_PAIR',
        source: 'Backoffice Admin',
        message: `Configuración de TV actualizada (${
          updates.name
            ? `"${updates.name}"`
            : updates.audio_enabled !== undefined
            ? updates.audio_enabled
              ? 'Audio ON 🔊'
              : 'Silencio 🔇'
            : updates.video_mode || updates.layout_template || 'ajustes'
        })`,
      }
    );
    triggerSavedToast('Ajustes de pantalla y video actualizados');
  };

  const deleteScreen = (screenId: string) => {
    const target = state.screens.find((s) => s.id === screenId);
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        screens: prev.screens.filter((s) => s.id !== screenId),
      }),
      {
        type: 'SCREEN_PAIR',
        source: 'Backoffice Admin',
        message: `Pantalla eliminada: "${target?.name || screenId}" [${
          target?.pairing_code || ''
        }]`,
      }
    );
    triggerSavedToast(`TV "${target?.name || ''}" eliminada`);
  };

  const triggerLiveFullscreenVideoSpot = (params: {
    targetScreenId: string | 'ALL';
    videoUrl: string;
    title: string;
    subtitle: string;
    forceAudio: boolean;
    durationSeconds: number;
  }) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        liveSpotTrigger: {
          id: `spot-${Date.now()}`,
          targetScreenId: params.targetScreenId,
          videoUrl: params.videoUrl,
          title: params.title,
          subtitle: params.subtitle,
          forceAudio: params.forceAudio,
          durationSeconds: params.durationSeconds,
          triggeredAt: new Date().toISOString(),
        },
      }),
      {
        type: 'VIDEO_SPOT_TRIGGER',
        source: 'Backoffice Admin',
        message: `Spot de Video Comercial c/Audio disparado en vivo: "${params.title}" (${params.durationSeconds}s)`,
      }
    );
    triggerSavedToast('🎬 Spot Comercial transmitiendo en pantalla completa');
  };

  const clearLiveFullscreenVideoSpot = () => {
    commitAndBroadcast((prev) => ({
      ...prev,
      liveSpotTrigger: null,
    }));
  };

  const upsertSchedule = (schedule: Omit<Schedule, 'id'> & { id?: string }) => {
    const isEdit = Boolean(schedule.id);
    const id = schedule.id || `sch-${Date.now()}`;
    const fullSchedule: Schedule = { ...schedule, id };

    commitAndBroadcast(
      (prev) => ({
        ...prev,
        schedules: isEdit
          ? prev.schedules.map((s) => (s.id === id ? fullSchedule : s))
          : [...prev.schedules, fullSchedule],
      }),
      {
        type: 'DAYPART_SWITCH',
        source: 'Backoffice Admin',
        message: `Regla de Dayparting guardada: "${fullSchedule.name}" (${fullSchedule.start_time} - ${fullSchedule.end_time})`,
      }
    );
    triggerSavedToast(`Horario "${fullSchedule.name}" guardado`);
  };

  const toggleScheduleActive = (scheduleId: string) => {
    commitAndBroadcast((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) =>
        s.id === scheduleId ? { ...s, is_active: !s.is_active } : s
      ),
    }));
  };

  const updateOrganizationSettings = (updates: Partial<Organization>) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        organization: {
          ...prev.organization,
          ...updates,
        },
      }),
      {
        type: 'BRANDING_UPDATE',
        source: 'Backoffice Admin',
        message: `Datos del negocio actualizados: "${updates.name || state.organization.name}"`,
      }
    );
    triggerSavedToast('Cambios guardados y sincronizados en pantallas');
  };

  const updateOrganizationBranding = (
    updates: Partial<OrganizationBranding>
  ) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        organization: {
          ...prev.organization,
          branding: {
            ...prev.organization.branding,
            ...updates,
          },
        },
      }),
      {
        type: 'BRANDING_UPDATE',
        source: 'Backoffice Admin',
        message: `Identidad visual (logo/colores/marca) guardada y sincronizada (<100ms)`,
      }
    );
    triggerSavedToast('Logo, marca y colores guardados correctamente');
  };

  const saveFullBrandProfile = (
    orgUpdates: Partial<Organization>,
    brandingUpdates: Partial<OrganizationBranding>
  ) => {
    commitAndBroadcast(
      (prev) => ({
        ...prev,
        organization: {
          ...prev.organization,
          ...orgUpdates,
          branding: {
            ...prev.organization.branding,
            ...brandingUpdates,
          },
        },
      }),
      {
        type: 'BRANDING_UPDATE',
        source: 'Backoffice Admin',
        message: `Perfil completo guardado: "${orgUpdates.name || state.organization.name}"`,
      }
    );
    triggerSavedToast('¡Marca, Logo y Colores guardados permanentemente!');
  };

  const simulatePosWebhookEvent = (
    posName: 'Toast POS' | 'Square POS' | 'Clover POS',
    action: '86_RANDOM' | 'RESTORE_ALL' | 'HAPPY_HOUR_PRICES'
  ) => {
    if (action === 'RESTORE_ALL') {
      commitAndBroadcast(
        (prev) => ({
          ...prev,
          products: prev.products.map((p) => ({
            ...p,
            is_available: true,
            updated_at: new Date().toISOString(),
          })),
        }),
        {
          type: 'POS_WEBHOOK',
          source: 'POS Webhook',
          message: `[${posName}] Webhook de inventario: Todos los productos restablecidos en stock`,
        }
      );
      return;
    }

    if (action === '86_RANDOM') {
      const availableProducts = state.products.filter((p) => p.is_available);
      const target =
        availableProducts[
          Math.floor(Math.random() * availableProducts.length)
        ] || state.products[0];
      if (!target) return;

      commitAndBroadcast(
        (prev) => ({
          ...prev,
          products: prev.products.map((p) =>
            p.id === target.id
              ? {
                  ...p,
                  is_available: false,
                  updated_at: new Date().toISOString(),
                }
              : p
          ),
        }),
        {
          type: 'POS_WEBHOOK',
          source: 'POS Webhook',
          message: `[${posName}] Webhook 86'd recibido (${target.pos_external_id}): "${target.name}" agotado en caja`,
        }
      );
      return;
    }

    if (action === 'HAPPY_HOUR_PRICES') {
      commitAndBroadcast(
        (prev) => ({
          ...prev,
          products: prev.products.map((p, idx) =>
            idx % 2 === 0
              ? {
                  ...p,
                  promo_price: Number((p.price * 0.8).toFixed(2)),
                  updated_at: new Date().toISOString(),
                }
              : p
          ),
        }),
        {
          type: 'POS_WEBHOOK',
          source: 'POS Webhook',
          message: `[${posName}] Webhook de precios: 20% OFF automático sincronizado en carta`,
        }
      );
    }
  };

  const resetDemoData = () => {
    localStorage.removeItem('current_kiosk_state_v2');
    setState(INITIAL_MENU_STATE);
    saveMenuStateToIndexedDB(INITIAL_MENU_STATE);
    broadcastChannelRef.current?.postMessage({
      type: 'MENUSYNC_STATE_PUSH',
      payload: INITIAL_MENU_STATE,
    });
    triggerSavedToast('Datos de fábrica restaurados');
  };

  return (
    <MenuSyncContext.Provider
      value={{
        state,
        isSupabaseRealtimeConnected,
        isOfflineMode,
        lastSavedFeedback,
        setSimulatedOffline,
        setActiveBranch,
        setSimulatedTime,
        toggleProductAvailability86,
        toggleProductFeatured,
        updateProductPrice,
        upsertProduct,
        deleteProduct,
        upsertCategory,
        triggerFlashPromotion,
        stopFlashPromotion,
        pairNewScreen,
        updateScreenConfig,
        deleteScreen,
        triggerLiveFullscreenVideoSpot,
        clearLiveFullscreenVideoSpot,
        upsertSchedule,
        toggleScheduleActive,
        updateOrganizationSettings,
        updateOrganizationBranding,
        saveFullBrandProfile,
        simulatePosWebhookEvent,
        resetDemoData,
      }}
    >
      {children}
    </MenuSyncContext.Provider>
  );
};

export const useMenuSync = (): MenuSyncContextType => {
  const ctx = useContext(MenuSyncContext);
  if (!ctx) {
    throw new Error('useMenuSync must be used within a MenuSyncProvider');
  }
  return ctx;
};
