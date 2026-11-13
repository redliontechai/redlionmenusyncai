export type SubscriptionPlan = 'starter' | 'pro' | 'business' | 'enterprise';
export type HardwareModality = 'saas_byod' | 'haas_rental' | 'financing_12m';
export type ScreenOrientation = 'landscape' | 'portrait';
export type LayoutTemplate = 'classic_grid' | 'split_promo' | 'portrait_totem' | 'drive_thru';
export type ScreenStatus = 'online' | 'offline';
export type FontStylePreset = 'modern_outfit' | 'editorial_serif' | 'bold_display';
export type CardStylePreset = 'glass_rounded' | 'sharp_minimal' | 'warm_bordered';
export type VideoDisplayMode = 'disabled' | 'side_zone_loop' | 'fullscreen_spot_interval' | 'both_side_and_spot';

export interface OrganizationBranding {
  tagline: string;
  logo_url: string;
  logo_icon_name: 'Flame' | 'Fish' | 'Coffee' | 'Pizza' | 'Utensils' | 'Crown';
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  font_preset: FontStylePreset;
  card_style: CardStylePreset;
  show_product_images: boolean;
  show_prices_with_tax_note: string;
  promo_upsell_Enabled: boolean;
  promo_upsell_badge: string;
  promo_upsell_title: string;
  promo_upsell_subtitle: string;
  promo_upsell_price_text: string;
  custom_footer_text: string;
  qr_menu_url: string;
  show_qr_in_player: boolean;
  // Configuración global de Video Promocional
  default_promo_video_url: string;
  default_promo_video_title: string;
  default_promo_video_subtitle: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  hardware_modality: HardwareModality;
  setup_fee_usd: number;
  monthly_fee_usd: number;
  api_key: string;
  fda_calorie_compliance: boolean;
  currency_symbol: string;
  branding: OrganizationBranding;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  timezone: string;
  wifi_ssid: string;
}

export interface Screen {
  id: string;
  branch_id: string;
  name: string;
  pairing_code: string;
  is_paired: boolean;
  status: ScreenStatus;
  orientation: ScreenOrientation;
  resolution: string;
  layout_template: LayoutTemplate;
  hardware_type: string;
  is_outdoor_high_nits: boolean;
  last_heartbeat: string;
  // Configuración de Video y Audio por Pantalla TV
  video_mode: VideoDisplayMode;
  promo_video_url: string;
  promo_video_title: string;
  audio_enabled: boolean;        // true = Con Audio del Video en esta TV, false = Video en Silencio (Mute)
  volume_percent: number;        // 0 a 100
  spot_interval_minutes: number; // Cada cuántos minutos interrumpe con comercial pantalla completa
  spot_duration_seconds: number; // Duración del spot pantalla completa (ej. 15s, 20s, 30s)
  flash_chime_enabled: boolean;  // Jingle/campana sonora al lanzar Oferta Relámpago
  chef_chime_enabled?: boolean;  // Sonido suave opcional al cambiar la Recomendación del Chef (por defecto false para no interrumpir el video)
}

export interface Category {
  id: string;
  branch_id: string;
  name: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  branch_id: string;
  pos_external_id: string;
  name: string;
  description: string;
  price: number;
  promo_price?: number | null;
  calories: number;
  image_url: string;
  video_url?: string;
  is_available: boolean; // false = 86'd (Agotado al instante)
  is_featured: boolean;
  tags: string[];
  sort_order: number;
  updated_at: string;
}

export interface Schedule {
  id: string;
  branch_id: string;
  screen_id?: string | null;
  name: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  days_of_week: number[]; // 0=Dom ... 6=Sab
  category_ids: string[];
  layout_override?: LayoutTemplate | null;
  is_active: boolean;
  priority: number;
}

export interface FlashPromotion {
  id: string;
  branch_id: string;
  product_id?: string | null;
  title: string;
  subtitle: string;
  badge_text: string;
  special_price?: number | null;
  video_url?: string | null;
  play_sound_chime?: boolean;
  duration_minutes: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface SyncEventLog {
  id: string;
  timestamp: string;
  type:
    | '86_TOGGLE'
    | 'PRICE_UPDATE'
    | 'FLASH_PROMO'
    | 'SCREEN_PAIR'
    | 'POS_WEBHOOK'
    | 'DAYPART_SWITCH'
    | 'BRANDING_UPDATE'
    | 'VIDEO_SPOT_TRIGGER';
  source: 'Backoffice Admin' | 'POS Webhook' | 'Display Player' | 'System Clock';
  message: string;
  latencyMs: number;
}

export interface MenuAppState {
  organization: Organization;
  branches: Branch[];
  activeBranchId: string;
  screens: Screen[];
  categories: Category[];
  products: Product[];
  schedules: Schedule[];
  flashPromotions: FlashPromotion[];
  syncLogs: SyncEventLog[];
  lastSyncedAt: string;
  simulatedTimeOverride: string | null;
  // Permite disparar un Spot Comercial Pantalla Completa en vivo hacia una TV o todas
  liveSpotTrigger: {
    id: string;
    targetScreenId: string | 'ALL';
    videoUrl: string;
    title: string;
    subtitle: string;
    forceAudio: boolean;
    durationSeconds: number;
    triggeredAt: string;
  } | null;
}
