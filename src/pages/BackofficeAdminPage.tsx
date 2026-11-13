import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tv,
  CalendarClock,
  Zap,
  Webhook,
  Plus,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wifi,
  WifiOff,
  ExternalLink,
  RotateCcw,
  Star,
  DollarSign,
  Eye,
  Trash2,
  Edit3,
  ShieldCheck,
  Clock,
  Activity,
  Upload,
  SplitSquareVertical,
  Palette,
  Building2,
  Layers,
  Save,
  Volume2,
  VolumeX,
  Video,
  Play,
  BellRing,
  Instagram,
} from 'lucide-react';
import { useMenuSync } from '../context/MenuSyncContext';
import { BrandLogoIcon, DisplayPlayerPage } from './DisplayPlayerPage';
import { InstagramContentGenerator } from '../components/InstagramContentGenerator';
import {
  CardStylePreset,
  FontStylePreset,
  LayoutTemplate,
  Organization,
  OrganizationBranding,
  Product,
  ScreenOrientation,
  VideoDisplayMode,
} from '../types/menu';
import { DEMO_PROMO_VIDEOS } from '../data/seedData';
import {
  playPromoAttentionChime,
  playChefRecommendationChime,
} from '../utils/soundEffects';
import { getActiveDaypartSchedule, getCurrentHHMM } from '../utils/dayparting';

type AdminTab =
  | 'branding_studio'
  | 'overview'
  | 'catalog_86'
  | 'screens'
  | 'dayparting'
  | 'flash_promos'
  | 'instagram_ai'
  | 'pos_webhooks';

const COLOR_THEME_PRESETS: Array<{
  name: string;
  description: string;
  primary: string;
  accent: string;
  background: string;
  surface: string;
}> = [
  {
    name: 'Red Lion Smokehouse (Fuego & Brasa)',
    description: 'Alto contraste QSR para Burgers, Carnes y Alitas',
    primary: '#dc2626',
    accent: '#f59e0b',
    background: '#09090b',
    surface: '#18181b',
  },
  {
    name: 'Esmeralda & Océano (Sushi / Mariscos)',
    description: 'Elegancia nocturna para Cocina Nikkei, Pescados y Coctelería',
    primary: '#059669',
    accent: '#38bdf8',
    background: '#031117',
    surface: '#08202b',
  },
  {
    name: 'Espresso & Caramelo (Café / Bakery)',
    description: 'Tonos cálidos tostados para Cafeterías y Panaderías Artesanales',
    primary: '#d97706',
    accent: '#fcd34d',
    background: '#17110b',
    surface: '#261c14',
  },
  {
    name: 'Oliva & Terracota (Pizzería / Trattoria)',
    description: 'Estilo mediterráneo para Pizzerías a la Leña y Pastas',
    primary: '#ea580c',
    accent: '#84cc16',
    background: '#11160d',
    surface: '#1c2416',
  },
  {
    name: 'Oro & Vino Tinto (Steakhouse / Cava)',
    description: 'Lujo Fine Dining para Cortes Premium y Vinos',
    primary: '#9f1239',
    accent: '#fbbf24',
    background: '#0f070a',
    surface: '#1f1016',
  },
];

// Helper to compress and resize uploaded logo image so it saves reliably in IndexedDB + LocalStorage + Realtime
function resizeAndConvertLogoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      // If SVG, return directly
      if (file.type === 'image/svg+xml') {
        resolve(resultStr);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(resultStr);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.onerror = () => resolve(resultStr);
      img.src = resultStr;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const BackofficeAdminPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as AdminTab) || 'branding_studio';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [showSplitSimulator, setShowSplitSimulator] = useState<boolean>(true);

  const {
    state,
    isSupabaseRealtimeConnected,
    isOfflineMode,
    lastSavedFeedback,
    setSimulatedOffline,
    setSimulatedTime,
    toggleProductAvailability86,
    toggleProductFeatured,
    updateProductPrice,
    upsertProduct,
    deleteProduct,
    triggerFlashPromotion,
    stopFlashPromotion,
    triggerLiveFullscreenVideoSpot,
    clearLiveFullscreenVideoSpot,
    pairNewScreen,
    updateScreenConfig,
    deleteScreen,
    upsertSchedule,
    toggleScheduleActive,
    updateOrganizationSettings,
    updateOrganizationBranding,
    saveFullBrandProfile,
    simulatePosWebhookEvent,
    resetDemoData,
  } = useMenuSync();

  const selectedPreviewScreenId = state.screens[0]?.id || 'scr-counter-1';
  const [customPreviewScreenId, setCustomPreviewScreenId] = useState<string>(
    selectedPreviewScreenId
  );

  const effectivePreviewScreenId = useMemo(() => {
    const exists = state.screens.some((s) => s.id === customPreviewScreenId);
    return exists ? customPreviewScreenId : state.screens[0]?.id || 'scr-counter-1';
  }, [state.screens, customPreviewScreenId]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // =========================================================================
  // LOCAL FORM STATE FOR BRANDING STUDIO (SYNCS LIVE + EXPLICIT SAVE BUTTON)
  // =========================================================================
  const branding = state.organization.branding;
  const [businessNameInput, setBusinessNameInput] = useState<string>(
    state.organization.name
  );
  const [taglineInput, setTaglineInput] = useState<string>(branding.tagline);
  const [logoUrlInput, setLogoUrlInput] = useState<string>(branding.logo_url);
  const [currencyInput, setCurrencyInput] = useState<string>(
    state.organization.currency_symbol
  );
  const [planInput, setPlanInput] = useState<Organization['plan']>(
    state.organization.plan
  );

  // Keep form inputs synchronized if state loads from IndexedDB or resets
  useEffect(() => {
    setBusinessNameInput(state.organization.name);
    setTaglineInput(state.organization.branding.tagline);
    setLogoUrlInput(state.organization.branding.logo_url);
    setCurrencyInput(state.organization.currency_symbol);
    setPlanInput(state.organization.plan);
  }, [
    state.organization.name,
    state.organization.branding.tagline,
    state.organization.branding.logo_url,
    state.organization.currency_symbol,
    state.organization.plan,
  ]);

  // Upload custom Logo image (Compressed DataURL so it saves permanently and broadcasts in <100ms)
  const handleLogoFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimizedDataUrl = await resizeAndConvertLogoToDataUrl(file);
      setLogoUrlInput(optimizedDataUrl);
      updateOrganizationBranding({ logo_url: optimizedDataUrl });
    } catch {
      // Fallback
    }
  };

  const handleExplicitSaveBrandingForm = (e: React.FormEvent) => {
    e.preventDefault();
    saveFullBrandProfile(
      {
        name: businessNameInput.trim() || 'Mi Restaurante',
        currency_symbol: currencyInput,
        plan: planInput,
      },
      {
        tagline: taglineInput,
        logo_url: logoUrlInput,
      }
    );
  };

  // Catalog Filters & Product Modal State
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(
    null
  );

  // Screen Pairing Form State
  const [pairingCodeInput, setPairingCodeInput] = useState<string>('RL-4090');
  const [newScreenName, setNewScreenName] = useState<string>(
    'Pantalla 4 — Barra Coctelería & Terraza'
  );
  const [newScreenOrientation, setNewScreenOrientation] =
    useState<ScreenOrientation>('landscape');
  const [newScreenLayout, setNewScreenLayout] =
    useState<LayoutTemplate>('split_promo');
  const [newScreenHardware, setNewScreenHardware] = useState<string>(
    'TV Insignia 75" Fire TV 4K UHD'
  );
  const [newScreenOutdoor, setNewScreenOutdoor] = useState<boolean>(false);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [confirmDeleteScreenId, setConfirmDeleteScreenId] = useState<
    string | null
  >(null);

  // Flash Promo Form State
  const [promoTitle, setPromoTitle] = useState<string>(
    'OFERTA ESPECIAL: 2x1 EN ESPECIALIDADES DE LA CASA'
  );
  const [promoSubtitle, setPromoSubtitle] = useState<string>(
    '¡Aprovecha por tiempo limitado nuestra promoción en vivo directamente en mostrador!'
  );
  const [promoBadge, setPromoBadge] = useState<string>(
    '⚡ OFERTA RELÁMPAGO EN VIVO'
  );
  const [promoPrice, setPromoPrice] = useState<string>('11.90');
  const [promoDuration, setPromoDuration] = useState<number>(30);
  const [promoPlayChime, setPromoPlayChime] = useState<boolean>(true);

  // Dayparting New Schedule Form
  const [newScheduleName, setNewScheduleName] = useState<string>(
    'Turno Tarde / Happy Hour'
  );
  const [newScheduleStart, setNewScheduleStart] = useState<string>('17:00');
  const [newScheduleEnd, setNewScheduleEnd] = useState<string>('21:00');
  const [newScheduleCategories, setNewScheduleCategories] = useState<string[]>(
    []
  );

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      const matchesCat =
        selectedCategoryFilter === 'ALL' ||
        p.category_id === selectedCategoryFilter;
      const matchesQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pos_external_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [state.products, selectedCategoryFilter, searchQuery]);

  const activeDaypart = useMemo(
    () =>
      getActiveDaypartSchedule(
        state.schedules,
        state.activeBranchId,
        null,
        state.simulatedTimeOverride
      ),
    [state.schedules, state.activeBranchId, state.simulatedTimeOverride]
  );

  const availableCount = state.products.filter((p) => p.is_available).length;
  const soldOutCount = state.products.filter((p) => !p.is_available).length;
  const onlineScreensCount = state.screens.filter(
    (s) => s.status === 'online'
  ).length;

  const handleSaveProductModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.category_id) return;
    upsertProduct({
      id: editingProduct.id,
      category_id: editingProduct.category_id,
      branch_id: state.activeBranchId,
      pos_external_id:
        editingProduct.pos_external_id ||
        `POS-${Math.floor(100 + Math.random() * 900)}`,
      name: editingProduct.name,
      description:
        editingProduct.description ||
        'Preparado al momento con ingredientes frescos seleccionados.',
      price: Number(editingProduct.price) || 12.5,
      promo_price: editingProduct.promo_price
        ? Number(editingProduct.promo_price)
        : null,
      calories: Number(editingProduct.calories) || 650,
      image_url:
        editingProduct.image_url ||
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
      is_available: editingProduct.is_available ?? true,
      is_featured: editingProduct.is_featured ?? false,
      tags: editingProduct.tags || ['Nuevo'],
      sort_order: editingProduct.sort_order || 1,
    });
    setEditingProduct(null);
  };

  const handlePairNewScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput.trim() || !newScreenName.trim()) return;
    const created = pairNewScreen({
      pairingCode: pairingCodeInput,
      name: newScreenName,
      branchId: state.activeBranchId,
      orientation: newScreenOrientation,
      layoutTemplate: newScreenLayout,
      hardwareType: newScreenHardware,
      isOutdoorHighNits: newScreenOutdoor,
    });
    setCustomPreviewScreenId(created.id);
    setPairingCodeInput(`RL-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleTriggerFlashPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoPlayChime) {
      playPromoAttentionChime(85);
    }
    triggerFlashPromotion({
      branch_id: state.activeBranchId,
      product_id: state.products[0]?.id || null,
      title: promoTitle,
      subtitle: promoSubtitle,
      badge_text: promoBadge,
      special_price: promoPrice ? Number(promoPrice) : null,
      duration_minutes: promoDuration,
      play_sound_chime: promoPlayChime,
    });
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;
    upsertSchedule({
      branch_id: state.activeBranchId,
      screen_id: null,
      name: newScheduleName,
      start_time: newScheduleStart,
      end_time: newScheduleEnd,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      category_ids:
        newScheduleCategories.length > 0
          ? newScheduleCategories
          : state.categories.map((c) => c.id),
      layout_override: null,
      is_active: true,
      priority: 8,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'pos_external_id,name,category_id,price,promo_price,calories,is_available,is_featured',
    ];
    const rows = state.products.map(
      (p) =>
        `"${p.pos_external_id}","${p.name.replace(/"/g, '""')}","${
          p.category_id
        }",${p.price},${p.promo_price || ''},${p.calories},${p.is_available},${
          p.is_featured
        }`
    );
    const csvBlob = new Blob([[...headers, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* FLOATING SAVE CONFIRMATION TOAST */}
      {lastSavedFeedback && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-xs shadow-2xl border border-emerald-300 animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{lastSavedFeedback}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/80 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={state.organization.name}
              className="w-11 h-11 rounded-xl object-cover border-2 shadow-md"
              style={{ borderColor: branding.accent_color }}
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`,
              }}
            >
              <BrandLogoIcon
                iconName={branding.logo_icon_name}
                className="w-6 h-6 text-white"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight font-['Outfit'] text-white">
                {state.organization.name}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border"
                style={{
                  backgroundColor: `${branding.primary_color}25`,
                  color: branding.accent_color,
                  borderColor: `${branding.primary_color}50`,
                }}
              >
                Plan {state.organization.plan.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Red Lion MenuSync AI • Sincronización Realtime &lt;100ms &amp; Kiosk Offline 35 días
            </p>
          </div>
        </div>

        {/* Right Controls: Clock, Offline Toggle, Split View & Launch Player */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={state.simulatedTimeOverride || 'REALTIME'}
              onChange={(e) =>
                setSimulatedTime(
                  e.target.value === 'REALTIME' ? null : e.target.value
                )
              }
              className="bg-transparent font-semibold text-amber-300 focus:outline-none cursor-pointer"
            >
              <option value="REALTIME" className="bg-zinc-900 text-white">
                Hora Real ({getCurrentHHMM(null)})
              </option>
              <option value="08:30" className="bg-zinc-900 text-white">
                🌅 08:30 AM (Desayuno)
              </option>
              <option value="13:30" className="bg-zinc-900 text-white">
                🍔 01:30 PM (Almuerzo)
              </option>
              <option value="19:30" className="bg-zinc-900 text-white">
                🍺 07:30 PM (Cena/Bar)
              </option>
            </select>
          </div>

          <button
            onClick={() => setSimulatedOffline(!isOfflineMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isOfflineMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>
                  &lt;100ms {isSupabaseRealtimeConnected ? 'Cloud' : 'Local'}
                </span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowSplitSimulator(!showSplitSimulator)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showSplitSimulator
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/25'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>{showSplitSimulator ? 'Ocultar TV' : 'Vista TV en Vivo'}</span>
          </button>

          <Link
            to={`/player?screen=${effectivePreviewScreenId}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg transition"
            style={{
              background: `linear-gradient(90deg, ${branding.primary_color}, ${branding.accent_color})`,
            }}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Abrir Pantalla Kiosk</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* BODY LAYOUT: SIDEBAR + MAIN WORKSPACE + LIVE KIOSK SPLIT PREVIEW */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 bg-zinc-900/60 border-b lg:border-b-0 lg:border-r border-zinc-800/80 p-3.5 flex flex-col justify-between shrink-0">
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
            <SidebarTabButton
              active={activeTab === 'branding_studio'}
              onClick={() => handleTabChange('branding_studio')}
              icon={<Palette className="w-4 h-4" />}
              label="Marca, Logo & Colores"
              badge="Personalizar"
              badgeColor="amber"
            />
            <SidebarTabButton
              active={activeTab === 'overview'}
              onClick={() => handleTabChange('overview')}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Resumen & Telemetría"
            />
            <SidebarTabButton
              active={activeTab === 'catalog_86'}
              onClick={() => handleTabChange('catalog_86')}
              icon={<UtensilsCrossed className="w-4 h-4" />}
              label="Catálogo & 86-ing Rápido"
              badge={`${soldOutCount} 86'd`}
              badgeColor={soldOutCount > 0 ? 'red' : 'zinc'}
            />
            <SidebarTabButton
              active={activeTab === 'flash_promos'}
              onClick={() => handleTabChange('flash_promos')}
              icon={<Zap className="w-4 h-4" />}
              label="Ofertas Relámpago"
              badge={
                state.flashPromotions.some((f) => f.is_active)
                  ? 'EN VIVO'
                  : undefined
              }
              badgeColor="amber"
            />
            <SidebarTabButton
              active={activeTab === 'instagram_ai'}
              onClick={() => handleTabChange('instagram_ai')}
              icon={<Instagram className="w-4 h-4" />}
              label="Instagram IA (Nano Banana 2)"
              badge="🍌 IA"
              badgeColor="amber"
            />
            <SidebarTabButton
              active={activeTab === 'screens'}
              onClick={() => handleTabChange('screens')}
              icon={<Tv className="w-4 h-4" />}
              label="Pantallas & Pairing"
              badge={`${onlineScreensCount}/${state.screens.length}`}
              badgeColor="emerald"
            />
            <SidebarTabButton
              active={activeTab === 'dayparting'}
              onClick={() => handleTabChange('dayparting')}
              icon={<CalendarClock className="w-4 h-4" />}
              label="Horarios (Dayparting)"
            />
            <SidebarTabButton
              active={activeTab === 'pos_webhooks'}
              onClick={() => handleTabChange('pos_webhooks')}
              icon={<Webhook className="w-4 h-4" />}
              label="Integración POS & FDA"
            />
          </nav>

          <div className="hidden lg:block mt-4 pt-4 border-t border-zinc-800/80 space-y-2.5">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">Turno Activo:</span>
                <span className="text-emerald-400 font-bold">Auto-Sync</span>
              </div>
              <div className="text-xs font-bold text-amber-400 truncate">
                {activeDaypart ? activeDaypart.name : 'Carta Todo el Día'}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Red local: {state.branches[0]?.wifi_ssid}
              </div>
            </div>

            <button
              onClick={resetDemoData}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Valores por Defecto
            </button>
          </div>
        </aside>

        {/* CENTER ADMIN CONTENT */}
        <main
          className={`flex-1 overflow-y-auto p-6 ${
            showSplitSimulator ? 'lg:w-1/2' : 'w-full'
          }`}
        >
          {/* =================================================================
              TAB 1: BRANDING, LOGO & COLORS CUSTOMIZATION STUDIO (SINGLE CLIENT)
             ================================================================= */}
          {activeTab === 'branding_studio' && (
            <form
              onSubmit={handleExplicitSaveBrandingForm}
              className="space-y-6 max-w-5xl mx-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Personalización del Negocio
                  </span>
                  <h2 className="text-2xl font-black font-['Outfit'] text-white mt-0.5">
                    Marca, Logotipo, Colores y Detalles de Pantalla
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Modifica el nombre del restaurante, sube tu logotipo y ajusta los colores. Se guardan de forma permanente en el navegador/base de datos local y se reflejan en vivo en la pantalla Kiosk.
                  </p>
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  Guardar Cambios de Marca y Logo
                </button>
              </div>

              {/* 1. BRAND IDENTITY: NAME, TAGLINE, CURRENCY & LOGO */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <Building2 className="w-4 h-4 text-amber-400" /> 1. Nombre del Negocio, Eslogan, Moneda y Logotipo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre Comercial del Restaurante / Negocio
                    </label>
                    <input
                      type="text"
                      value={businessNameInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBusinessNameInput(val);
                        updateOrganizationSettings({ name: val });
                      }}
                      placeholder="Ej: Red Lion Smokehouse & Grill"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Símbolo de Moneda
                    </label>
                    <select
                      value={currencyInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrencyInput(val);
                        updateOrganizationSettings({ currency_symbol: val });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white"
                    >
                      <option value="$">$ (USD / Peso / Dólar)</option>
                      <option value="S/">S/ (Sol Peruano)</option>
                      <option value="€">€ (Euro)</option>
                      <option value="RD$">RD$ (Peso Dominicano)</option>
                      <option value="₡">₡ (Colón)</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Plan Activo
                    </label>
                    <select
                      value={planInput}
                      onChange={(e) => {
                        const val = e.target.value as Organization['plan'];
                        setPlanInput(val);
                        updateOrganizationSettings({ plan: val });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold text-amber-400"
                    >
                      <option value="starter">Starter ($25/mes • 1 TV)</option>
                      <option value="pro">Pro ($59/mes • 3 TV)</option>
                      <option value="business">Business ($99/mes • 6 TV)</option>
                      <option value="enterprise">Enterprise (Cadenas)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Eslogan / Subtítulo bajo el Nombre en la TV
                  </label>
                  <input
                    type="text"
                    value={taglineInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaglineInput(val);
                      updateOrganizationBranding({ tagline: val });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Logo Live Preview + File Upload + URL + Fallback Icons */}
                <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Current Logo Preview Box */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    {branding.logo_url ? (
                      <img
                        src={branding.logo_url}
                        alt="Logo actual"
                        className="w-16 h-16 rounded-2xl object-cover border-2 shrink-0 bg-zinc-900"
                        style={{ borderColor: branding.accent_color }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`,
                        }}
                      >
                        <BrandLogoIcon
                          iconName={branding.logo_icon_name}
                          className="w-8 h-8 text-white"
                        />
                      </div>
                    )}
                    <div className="text-xs">
                      <div className="font-bold text-white">Vista Previa Logo</div>
                      <div className="text-[11px] text-zinc-400">
                        {branding.logo_url
                          ? 'Imagen personalizada activa'
                          : `Ícono: ${branding.logo_icon_name}`}
                      </div>
                      {branding.logo_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoUrlInput('');
                            updateOrganizationBranding({ logo_url: '' });
                          }}
                          className="mt-1 text-[11px] text-red-400 hover:underline font-semibold cursor-pointer"
                        >
                          Eliminar imagen de logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload from PC */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Subir Logo desde tu PC
                    </label>
                    <label className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer transition">
                      <Upload className="w-4 h-4" />
                      <span>Subir Imagen (PNG/JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Paste URL */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      O pegar URL de Logo
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={
                        logoUrlInput.startsWith('data:')
                          ? ''
                          : logoUrlInput
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setLogoUrlInput(val);
                        updateOrganizationBranding({ logo_url: val });
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      O usar Ícono Vectorial
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          'Flame',
                          'Fish',
                          'Coffee',
                          'Pizza',
                          'Utensils',
                          'Crown',
                        ] as OrganizationBranding['logo_icon_name'][]
                      ).map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => {
                            setLogoUrlInput('');
                            updateOrganizationBranding({
                              logo_icon_name: iconName,
                              logo_url: '',
                            });
                          }}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            branding.logo_icon_name === iconName &&
                            !branding.logo_url
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                          title={iconName}
                        >
                          <BrandLogoIcon
                            iconName={iconName}
                            className="w-4 h-4"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. COLOR PALETTE & INSTANT THEME PRESETS */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <Palette className="w-4 h-4 text-amber-400" /> 2. Colores de la Marca &amp; Paletas Rápidas
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ColorPickerField
                    label="Color Primario (Marca)"
                    value={branding.primary_color}
                    onChange={(val) =>
                      updateOrganizationBranding({ primary_color: val })
                    }
                  />
                  <ColorPickerField
                    label="Color Acento (Precios/Títulos)"
                    value={branding.accent_color}
                    onChange={(val) =>
                      updateOrganizationBranding({ accent_color: val })
                    }
                  />
                  <ColorPickerField
                    label="Fondo de Pantalla Kiosk"
                    value={branding.background_color}
                    onChange={(val) =>
                      updateOrganizationBranding({ background_color: val })
                    }
                  />
                  <ColorPickerField
                    label="Superficie de Tarjetas"
                    value={branding.surface_color}
                    onChange={(val) =>
                      updateOrganizationBranding({ surface_color: val })
                    }
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-400 mb-2">
                    Temas de color listos para aplicar con 1 clic:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {COLOR_THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          updateOrganizationBranding({
                            primary_color: preset.primary,
                            accent_color: preset.accent,
                            background_color: preset.background,
                            surface_color: preset.surface,
                          })
                        }
                        className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left transition cursor-pointer flex items-start gap-3"
                      >
                        <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                          <span
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {preset.name}
                          </div>
                          <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                            {preset.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. TYPOGRAPHY, CARD STYLE, UPSELL BANNER & QR FOOTER */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <Layers className="w-4 h-4 text-amber-400" /> 3. Tipografía, Estilo de Tarjetas, Upsell y Código QR
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Estilo Tipográfico en Pantalla
                    </label>
                    <select
                      value={branding.font_preset}
                      onChange={(e) =>
                        updateOrganizationBranding({
                          font_preset: e.target.value as FontStylePreset,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="modern_outfit">
                        Modern Sans (QSR / Casual)
                      </option>
                      <option value="editorial_serif">
                        Editorial Serif (Fine Dining / Elegante)
                      </option>
                      <option value="bold_display">
                        Bold Display Uppercase (Impacto)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Diseño de Bloques de Categoría
                    </label>
                    <select
                      value={branding.card_style}
                      onChange={(e) =>
                        updateOrganizationBranding({
                          card_style: e.target.value as CardStylePreset,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="glass_rounded">
                        Cristal Redondeado (Glassmorphism)
                      </option>
                      <option value="sharp_minimal">
                        Minimalista Recto con Borde Lateral
                      </option>
                      <option value="warm_bordered">
                        Borde Doble Artesanal (Bakery/Café)
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center gap-2 pt-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.show_product_images}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            show_product_images: e.target.checked,
                          })
                        }
                      />
                      Mostrar fotografías en lista de platillos
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.show_qr_in_player}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            show_qr_in_player: e.target.checked,
                          })
                        }
                      />
                      Mostrar QR de pedidos en cabecera TV
                    </label>
                  </div>
                </div>

                {/* Custom Upsell Box Config */}
                <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">
                      Tarjeta de Venta Sugerida (Upsell / Combo en Zona Derecha)
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.promo_upsell_Enabled}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            promo_upsell_Enabled: e.target.checked,
                          })
                        }
                      />
                      Activar bloque Upsell
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Etiqueta Superior
                      </label>
                      <input
                        type="text"
                        value={branding.promo_upsell_badge}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            promo_upsell_badge: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Título del Combo / Sugerencia
                      </label>
                      <input
                        type="text"
                        value={branding.promo_upsell_title}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            promo_upsell_title: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Precio / Badge Derecha
                      </label>
                      <input
                        type="text"
                        value={branding.promo_upsell_price_text}
                        onChange={(e) =>
                          updateOrganizationBranding({
                            promo_upsell_price_text: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Footer & Tax Note */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Mensaje Personalizado al Pie de Pantalla
                    </label>
                    <input
                      type="text"
                      value={branding.custom_footer_text}
                      onChange={(e) =>
                        updateOrganizationBranding({
                          custom_footer_text: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nota de Impuestos / Servicio
                    </label>
                    <input
                      type="text"
                      value={branding.show_prices_with_tax_note}
                      onChange={(e) =>
                        updateOrganizationBranding({
                          show_prices_with_tax_note: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Enlace QR Menú Móvil / Pedidos
                    </label>
                    <input
                      type="text"
                      value={branding.qr_menu_url}
                      onChange={(e) =>
                        updateOrganizationBranding({
                          qr_menu_url: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* =================================================================
              TAB 2: OVERVIEW & REALTIME TELEMETRY
             ================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiStatCard
                  title="Pantallas Vinculadas"
                  value={`${onlineScreensCount} / ${state.screens.length}`}
                  subtitle={`Plan ${state.organization.plan.toUpperCase()}`}
                  icon={<Tv className="w-5 h-5 text-emerald-400" />}
                />
                <KpiStatCard
                  title="Productos en Carta"
                  value={`${availableCount} Activos`}
                  subtitle={`${soldOutCount} en estado 86'd (Agotados)`}
                  icon={<UtensilsCrossed className="w-5 h-5 text-amber-400" />}
                />
                <KpiStatCard
                  title="Latencia WebSocket"
                  value="34 ms"
                  subtitle="Supabase Realtime + IndexedDB"
                  icon={<Activity className="w-5 h-5 text-red-400" />}
                />
                <KpiStatCard
                  title="Identidad de Marca"
                  value={state.organization.name}
                  subtitle={`Colores: ${branding.primary_color} / ${branding.accent_color}`}
                  icon={<Palette className="w-5 h-5 text-sky-400" />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-red-500" /> Pantallas Activas de {state.organization.name}
                    </h3>
                    <button
                      onClick={() => handleTabChange('screens')}
                      className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      + Vincular Nueva Pantalla
                    </button>
                  </div>

                  <div className="space-y-3">
                    {state.screens.map((scr) => (
                      <div
                        key={scr.id}
                        className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              scr.status === 'online'
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                                : 'bg-red-500'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">
                                {scr.name}
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                                {scr.pairing_code}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              {scr.hardware_type} • {scr.resolution} • Layout:{' '}
                              <strong className="text-zinc-200">
                                {scr.layout_template}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCustomPreviewScreenId(scr.id);
                              setShowSplitSimulator(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Previsualizar
                          </button>
                          <Link
                            to={`/player?screen=${scr.id}`}
                            target="_blank"
                            className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            Abrir TV <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" /> Eventos Realtime (&lt;100ms)
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      WebSockets Activo
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {state.syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/80 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                          <span className="font-bold text-amber-400">
                            {log.source}
                          </span>
                          <span className="font-mono text-emerald-400">
                            {log.latencyMs}ms •{' '}
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-zinc-200 font-medium">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 3: CATALOG & QUICK 86-ING BOARD
             ================================================================= */}
          {activeTab === 'catalog_86' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-['Outfit'] text-white">
                    Catálogo de Productos &amp; 86-ing Rápido
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Marca platos como agotados (<em>86&apos;d</em>), destaca promociones o ajusta precios en tiempo real.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Exportar CSV
                  </button>
                  <button
                    onClick={() =>
                      setEditingProduct({
                        category_id: state.categories[0]?.id || '',
                        name: '',
                        description: '',
                        price: 13.9,
                        calories: 650,
                        image_url:
                          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
                        is_available: true,
                        is_featured: false,
                        tags: ['Nuevo'],
                      })
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Nuevo Producto
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Todas ({state.products.length})
                  </button>
                  {state.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedCategoryFilter === cat.id
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Buscar por nombre o ID POS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 w-full sm:w-64"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const categoryName = state.categories.find(
                    (c) => c.id === product.category_id
                  )?.name;

                  return (
                    <div
                      key={product.id}
                      className={`rounded-2xl p-4 border transition flex items-start gap-4 ${
                        product.is_available
                          ? 'bg-zinc-900/80 border-zinc-800'
                          : 'bg-red-950/20 border-red-500/40'
                      }`}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={`w-20 h-20 rounded-xl object-cover shrink-0 border border-zinc-700 ${
                          !product.is_available ? 'grayscale opacity-50' : ''
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-zinc-400">
                              {product.pos_external_id} • {categoryName}
                            </span>
                            <h3 className="font-bold text-sm text-white leading-snug">
                              {product.name}
                            </h3>
                          </div>

                          <button
                            onClick={() =>
                              toggleProductAvailability86(product.id)
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                              product.is_available
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
                                : 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                            }`}
                          >
                            {product.is_available ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> En Stock
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> 86&apos;d Agotado
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-zinc-400 line-clamp-1 mt-1">
                          {product.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-800/80">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                              <input
                                type="number"
                                step="0.50"
                                value={product.price}
                                onChange={(e) =>
                                  updateProductPrice(
                                    product.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-16 bg-transparent text-xs font-bold text-white focus:outline-none"
                              />
                            </div>
                            <span className="text-xs text-zinc-400 font-semibold">
                              {product.calories} Cal
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleProductFeatured(product.id)}
                              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                product.is_featured
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                              }`}
                              title="Destacar en Zona Promo de la Pantalla"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                              title="Editar Producto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 transition cursor-pointer"
                              title="Eliminar Producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 4: FLASH PROMOTIONS
             ================================================================= */}
          {activeTab === 'flash_promos' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl font-black font-['Outfit'] text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-400" /> Lanzador de Ofertas Relámpago en Vivo (&lt;1s)
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Dispara un banner promocional con los colores corporativos de <strong>{state.organization.name}</strong> y cuenta regresiva en vivo.
                </p>
              </div>

              {state.flashPromotions
                .filter((fp) => fp.is_active)
                .map((activePromo) => (
                  <div
                    key={activePromo.id}
                    className="rounded-2xl p-5 text-white shadow-xl flex flex-wrap items-center justify-between gap-4"
                    style={{
                      background: `linear-gradient(90deg, ${branding.primary_color}, ${branding.accent_color})`,
                    }}
                  >
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-black uppercase">
                        {activePromo.badge_text} • TRANSMITIENDO EN PANTALLAS
                      </span>
                      <h3 className="text-xl font-black mt-1">
                        {activePromo.title}
                      </h3>
                      <p className="text-xs text-white/90 mt-0.5">
                        {activePromo.subtitle}
                      </p>
                    </div>
                    <button
                      onClick={() => stopFlashPromotion(activePromo.id)}
                      className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
                    >
                      Detener Promoción Ahora
                    </button>
                  </div>
                ))}

              <form
                onSubmit={handleTriggerFlashPromo}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4"
              >
                <h3 className="font-bold text-base text-white">
                  Configurar y Disparar Nueva Oferta Relámpago
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Título Principal en Pantalla
                    </label>
                    <input
                      type="text"
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Insignia / Badge Animado
                    </label>
                    <input
                      type="text"
                      value={promoBadge}
                      onChange={(e) => setPromoBadge(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Subtítulo Descriptivo
                  </label>
                  <input
                    type="text"
                    value={promoSubtitle}
                    onChange={(e) => setPromoSubtitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Precio Especial Promocional ({state.organization.currency_symbol})
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Duración del Temporizador (Minutos)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={promoDuration}
                      onChange={(e) =>
                        setPromoDuration(parseInt(e.target.value, 10) || 30)
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={promoPlayChime}
                        onChange={(e) => setPromoPlayChime(e.target.checked)}
                      />
                      🔊 Emitir Jingle / Campana de Atención en TVs con Audio Activo
                    </label>
                    <button
                      type="button"
                      onClick={() => playPromoAttentionChime(85)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5" /> Probar Sonido
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-black shadow-lg transition cursor-pointer"
                    style={{
                      background: `linear-gradient(90deg, ${branding.primary_color}, ${branding.accent_color})`,
                    }}
                  >
                    <Sparkles className="w-4 h-4" /> Lanzar Oferta en Pantallas (&lt;100ms)
                  </button>
                </div>
              </form>

              {/* GLOBAL COMMERCIAL VIDEO SPOT LAUNCHER */}
              <div className="bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Spot Comercial de Video con Audio
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Transmitir Spot Comercial en Pantalla Completa (Todas las TVs)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Interrumpe durante 15 segundos con video HD y audio en las pantallas que tengan sonido habilitado, y luego regresa automáticamente al menú digital.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {state.liveSpotTrigger && (
                    <button
                      type="button"
                      onClick={() => clearLiveFullscreenVideoSpot()}
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
                    >
                      Detener Spot
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      playPromoAttentionChime(85);
                      triggerLiveFullscreenVideoSpot({
                        targetScreenId: 'ALL',
                        videoUrl: DEMO_PROMO_VIDEOS[0].url,
                        title: DEMO_PROMO_VIDEOS[0].title,
                        subtitle: 'Spot Comercial en Vivo — ¡Pídelo hoy en mostrador!',
                        durationSeconds: 15,
                        forceAudio: true,
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" /> Disparar Spot Comercial (15s) Ahora
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 5: SCREENS & <30s 6-DIGIT PAIRING ENGINE
             ================================================================= */}
          {activeTab === 'screens' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h2 className="text-2xl font-black font-['Outfit'] text-white">
                  Pantallas Kiosk &amp; Vinculación (&lt;30s)
                </h2>
                <p className="text-xs text-zinc-400">
                  Conecta tus reproductores e ingresa el código único que aparece en la TV.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handlePairNewScreen}
                  className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 h-fit"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white">
                      Vincular Nueva Pantalla
                    </h3>
                    <Link
                      to="/player?pair=new"
                      target="_blank"
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    >
                      Simular TV nueva <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Código en Pantalla (Ej: RL-4090)
                    </label>
                    <input
                      type="text"
                      value={pairingCodeInput}
                      onChange={(e) =>
                        setPairingCodeInput(e.target.value.toUpperCase())
                      }
                      className="w-full bg-zinc-950 border-2 border-amber-500/50 rounded-xl px-3.5 py-2 text-lg font-mono font-black tracking-widest text-amber-400 uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre / Ubicación de la Pantalla
                    </label>
                    <input
                      type="text"
                      value={newScreenName}
                      onChange={(e) => setNewScreenName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Orientación
                      </label>
                      <select
                        value={newScreenOrientation}
                        onChange={(e) =>
                          setNewScreenOrientation(
                            e.target.value as ScreenOrientation
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="landscape">Horizontal (16:9)</option>
                        <option value="portrait">Vertical Tótem (9:16)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Layout Multi-Zona
                      </label>
                      <select
                        value={newScreenLayout}
                        onChange={(e) =>
                          setNewScreenLayout(e.target.value as LayoutTemplate)
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="split_promo">
                          Split 70/30 + Promo Loop
                        </option>
                        <option value="classic_grid">
                          Carta Clásica 3 Columnas
                        </option>
                        <option value="portrait_totem">
                          Tótem Vertical 9:16
                        </option>
                        <option value="drive_thru">
                          Drive-Thru Alto Contraste
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Reproductor de Hardware
                    </label>
                    <select
                      value={newScreenHardware}
                      onChange={(e) => setNewScreenHardware(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value='TV Insignia 75" Fire TV 4K UHD'>
                        TV Insignia 75&quot; Fire TV 4K UHD
                      </option>
                      <option value="Amazon Signage Stick 4K">
                        Amazon Signage Stick 4K ($99)
                      </option>
                      <option value="Amazon Fire TV Stick 4K Max">
                        Amazon Fire TV Stick 4K Max
                      </option>
                      <option value="Raspberry Pi 5 (RedLion Player OS)">
                        Raspberry Pi 5 (RedLion Player OS)
                      </option>
                      <option value="Apple TV 4K (64GB Ethernet)">
                        Apple TV 4K (64GB Ethernet)
                      </option>
                      <option value="Samsung OH55A-S Outdoor (3,500 nits IP65)">
                        Samsung OH55A-S Outdoor (3,500 nits IP65)
                      </option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newScreenOutdoor}
                      onChange={(e) => setNewScreenOutdoor(e.target.checked)}
                    />
                    Modo Exterior / Drive-Thru Alto Brillo (2,500–5,000 nits IP65)
                  </label>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Vincular y Transmitir Menú Ahora
                  </button>
                </form>

                <div className="lg:col-span-7 space-y-4">
                  {state.screens.length === 0 && (
                    <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
                      <Tv className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-white">
                        No hay televisores configurados
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Usa el formulario de la izquierda para vincular tu primera pantalla o haz clic en &quot;Restaurar Valores por Defecto&quot;.
                      </p>
                    </div>
                  )}

                  {state.screens.map((scr) => {
                    const isEditingThisScreen = editingScreenId === scr.id;
                    const isConfirmingDelete = confirmDeleteScreenId === scr.id;

                    return (
                    <div
                      key={scr.id}
                      className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                scr.status === 'online'
                                  ? 'bg-emerald-400'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <h4 className="font-bold text-base text-white">
                              {scr.name}
                            </h4>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-950 text-amber-400 border border-zinc-700">
                              {scr.pairing_code}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            Hardware: {scr.hardware_type} • {scr.resolution}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Modify TV Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setEditingScreenId(
                                isEditingThisScreen ? null : scr.id
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                              isEditingThisScreen
                                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>
                              {isEditingThisScreen ? 'Cerrar Edición' : 'Modificar TV'}
                            </span>
                          </button>

                          {/* Delete TV Button with Confirmation */}
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/60 rounded-xl px-2.5 py-1">
                              <span className="text-[11px] font-bold text-red-200">
                                ¿Borrar TV?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteScreen(scr.id);
                                  setConfirmDeleteScreenId(null);
                                  if (editingScreenId === scr.id) {
                                    setEditingScreenId(null);
                                  }
                                }}
                                className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-black cursor-pointer"
                              >
                                Sí, Borrar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteScreenId(null)}
                                className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteScreenId(scr.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-red-950/80 text-zinc-400 hover:text-red-300 border border-zinc-800 hover:border-red-500/40 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Eliminar esta pantalla configurada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Borrar</span>
                            </button>
                          )}

                          <Link
                            to={`/player?screen=${scr.id}`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Tv className="w-3.5 h-3.5" /> Abrir Kiosk
                          </Link>
                        </div>
                      </div>

                      {/* EXPANDABLE MODIFY TV DETAILS PANEL (NAME, CODE, HARDWARE, RESOLUTION, STATUS) */}
                      {isEditingThisScreen && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" /> Modificar Datos del Televisor
                            </span>
                            <span className="text-[11px] text-emerald-300 font-semibold">
                              ✓ Guardado automático al editar
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6">
                              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                Nombre / Ubicación de la TV
                              </label>
                              <input
                                type="text"
                                value={scr.name}
                                onChange={(e) =>
                                  updateScreenConfig(scr.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                Código de Vinculación
                              </label>
                              <input
                                type="text"
                                value={scr.pairing_code}
                                onChange={(e) =>
                                  updateScreenConfig(scr.id, {
                                    pairing_code: e.target.value.toUpperCase(),
                                  })
                                }
                                className="w-full bg-zinc-950 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs font-mono font-black text-amber-400 uppercase"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                Estado de Pantalla
                              </label>
                              <select
                                value={scr.status}
                                onChange={(e) =>
                                  updateScreenConfig(scr.id, {
                                    status: e.target.value as
                                      | 'online'
                                      | 'offline',
                                  })
                                }
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                              >
                                <option value="online">🟢 En Línea (Online)</option>
                                <option value="offline">🟡 En Pausa (Offline)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                Modelo de TV / Reproductor de Hardware
                              </label>
                              <input
                                type="text"
                                value={scr.hardware_type}
                                onChange={(e) =>
                                  updateScreenConfig(scr.id, {
                                    hardware_type: e.target.value,
                                  })
                                }
                                placeholder='Ej: TV Insignia 75" Fire TV 4K UHD'
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                Resolución de Pantalla
                              </label>
                              <select
                                value={scr.resolution}
                                onChange={(e) =>
                                  updateScreenConfig(scr.id, {
                                    resolution: e.target.value,
                                  })
                                }
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                              >
                                <option value='3840x2160 (4K UHD 75" 16:9)'>
                                  3840x2160 (4K UHD 75&quot; 16:9)
                                </option>
                                <option value="3840x2160 (4K UHD)">
                                  3840x2160 (4K UHD)
                                </option>
                                <option value="1920x1080 (Full HD)">
                                  1920x1080 (Full HD 16:9)
                                </option>
                                <option value="1080x1920 (Vertical HD)">
                                  1080x1920 (Vertical Tótem 9:16)
                                </option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Cambiar Plantilla en Vivo
                          </label>
                          <select
                            value={scr.layout_template}
                            onChange={(e) =>
                              updateScreenConfig(scr.id, {
                                layout_template: e.target
                                  .value as LayoutTemplate,
                              })
                            }
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="split_promo">
                              Split 70/30 + Promo
                            </option>
                            <option value="classic_grid">
                              Carta 3 Columnas QSR
                            </option>
                            <option value="portrait_totem">
                              Tótem Vertical 9:16
                            </option>
                            <option value="drive_thru">
                              Drive-Thru Alto Contraste
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Orientación Física
                          </label>
                          <select
                            value={scr.orientation}
                            onChange={(e) =>
                              updateScreenConfig(scr.id, {
                                orientation: e.target
                                  .value as ScreenOrientation,
                              })
                            }
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="landscape">
                              Horizontal (Landscape)
                            </option>
                            <option value="portrait">
                              Vertical (Portrait)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Modo Alto Brillo (Drive-Thru)
                          </label>
                          <button
                            onClick={() =>
                              updateScreenConfig(scr.id, {
                                is_outdoor_high_nits: !scr.is_outdoor_high_nits,
                              })
                            }
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              scr.is_outdoor_high_nits
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-zinc-950 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {scr.is_outdoor_high_nits
                              ? '☀ Activo (3,500 nits)'
                              : 'Interior Estándar (450 nits)'}
                          </button>
                        </div>
                      </div>

                      {/* PER-SCREEN PROMO VIDEO & INDEPENDENT AUDIO MATRIX */}
                      <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-wider text-white">
                              Video Promocional &amp; Audio Independiente en esta TV
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Per-Screen Video Audio Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                updateScreenConfig(scr.id, {
                                  audio_enabled: !scr.audio_enabled,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                                scr.audio_enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {scr.audio_enabled ? (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Audio Video: ON ({scr.volume_percent}%)</span>
                                </>
                              ) : (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Audio Video: MUTE</span>
                                </>
                              )}
                            </button>

                            {/* Per-Screen Chef Recommendation Chime Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !scr.chef_chime_enabled;
                                updateScreenConfig(scr.id, {
                                  chef_chime_enabled: nextVal,
                                });
                                if (nextVal) {
                                  playChefRecommendationChime(scr.volume_percent || 80);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                                scr.chef_chime_enabled
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                              title="Activar o silenciar el sonido cuando cambia la Recomendación del Chef"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>
                                Sonido Chef: {scr.chef_chime_enabled ? 'ON' : 'OFF'}
                              </span>
                            </button>

                            {/* Per-Screen Flash Promo Chime Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !scr.flash_chime_enabled;
                                updateScreenConfig(scr.id, {
                                  flash_chime_enabled: nextVal,
                                });
                                if (nextVal) {
                                  playPromoAttentionChime(scr.volume_percent || 80);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                                scr.flash_chime_enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                              title="Activar o silenciar la campana en Ofertas Relámpago"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>
                                Campana Flash: {scr.flash_chime_enabled ? 'ON' : 'OFF'}
                              </span>
                            </button>

                            {/* Instant Commercial Spot Trigger for this TV */}
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPreviewScreenId(scr.id);
                                if (scr.audio_enabled) {
                                  playPromoAttentionChime(scr.volume_percent || 80);
                                }
                                triggerLiveFullscreenVideoSpot({
                                  targetScreenId: scr.id,
                                  videoUrl:
                                    scr.promo_video_url || DEMO_PROMO_VIDEOS[0].url,
                                  title:
                                    scr.promo_video_title ||
                                    DEMO_PROMO_VIDEOS[0].title,
                                  subtitle: `Transmitiendo en ${scr.name}`,
                                  durationSeconds: scr.spot_duration_seconds || 15,
                                  forceAudio: scr.audio_enabled,
                                });
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow"
                            >
                              <Play className="w-3 h-3 fill-current" /> Lanzar Spot Ahora
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Modo de Video en esta Pantalla
                            </label>
                            <select
                              value={scr.video_mode || 'disabled'}
                              onChange={(e) =>
                                updateScreenConfig(scr.id, {
                                  video_mode: e.target.value as VideoDisplayMode,
                                })
                              }
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                            >
                              <option value="disabled">
                                Desactivado (Solo Fotos / Carta Estática)
                              </option>
                              <option value="side_zone_loop">
                                Video Continuo en Zona Promo (70/30 o Tótem)
                              </option>
                              <option value="fullscreen_spot_interval">
                                Spot Pantalla Completa cada {scr.spot_interval_minutes || 5} min
                              </option>
                              <option value="both_side_and_spot">
                                Ambos: Video Lateral + Spot Pantalla Completa
                              </option>
                            </select>
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Video Predefinido HD o Personalizado
                            </label>
                            <select
                              value={
                                DEMO_PROMO_VIDEOS.some(
                                  (v) => v.url === scr.promo_video_url
                                )
                                  ? scr.promo_video_url
                                  : 'CUSTOM'
                              }
                              onChange={(e) => {
                                if (e.target.value === 'CUSTOM') return;
                                const found = DEMO_PROMO_VIDEOS.find(
                                  (v) => v.url === e.target.value
                                );
                                if (found) {
                                  updateScreenConfig(scr.id, {
                                    promo_video_url: found.url,
                                    promo_video_title: found.title,
                                  });
                                }
                              }}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-semibold"
                            >
                              {DEMO_PROMO_VIDEOS.map((vid) => (
                                <option key={vid.id} value={vid.url}>
                                  🎬 {vid.label}
                                </option>
                              ))}
                              <option value="CUSTOM">🔗 URL .MP4 Personalizada</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Volumen TV ({scr.volume_percent ?? 75}%)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              disabled={!scr.audio_enabled}
                              value={scr.volume_percent ?? 75}
                              onChange={(e) =>
                                updateScreenConfig(scr.id, {
                                  volume_percent: parseInt(e.target.value, 10),
                                })
                              }
                              className="w-full accent-emerald-400 cursor-pointer mt-1.5"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              URL de Video (.mp4 / .webm)
                            </label>
                            <input
                              type="url"
                              value={scr.promo_video_url || ''}
                              onChange={(e) =>
                                updateScreenConfig(scr.id, {
                                  promo_video_url: e.target.value,
                                })
                              }
                              placeholder="https://.../promo.mp4"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Título Superpuesto en el Video
                            </label>
                            <input
                              type="text"
                              value={scr.promo_video_title || ''}
                              onChange={(e) =>
                                updateScreenConfig(scr.id, {
                                  promo_video_title: e.target.value,
                                })
                              }
                              placeholder="Ej: 2x1 en Cerveza Artesanal"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Frecuencia Spot (Minutos)
                            </label>
                            <select
                              value={scr.spot_interval_minutes || 5}
                              onChange={(e) =>
                                updateScreenConfig(scr.id, {
                                  spot_interval_minutes: parseInt(
                                    e.target.value,
                                    10
                                  ),
                                })
                              }
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white"
                            >
                              <option value={1}>Cada 1 min (Demo Rápida)</option>
                              <option value={3}>Cada 3 minutos</option>
                              <option value={5}>Cada 5 minutos</option>
                              <option value={10}>Cada 10 minutos</option>
                              <option value={15}>Cada 15 minutos</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 6: DAYPARTING SCHEDULER
             ================================================================= */}
          {activeTab === 'dayparting' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-['Outfit'] text-white">
                    Programación Horaria Automática (Dayparting)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Alterna automáticamente los menús de Desayuno, Almuerzo o Cena según el reloj del restaurante.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs">
                  <span className="text-zinc-400">Probar Hora:</span>
                  <button
                    onClick={() => setSimulatedTime('08:30')}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold cursor-pointer"
                  >
                    08:30 AM
                  </button>
                  <button
                    onClick={() => setSimulatedTime('13:30')}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-300 font-semibold cursor-pointer"
                  >
                    01:30 PM
                  </button>
                  <button
                    onClick={() => setSimulatedTime(null)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold cursor-pointer"
                  >
                    Hora Actual
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  {state.schedules.map((sch) => {
                    const isCurrentlyRunning = activeDaypart?.id === sch.id;
                    return (
                      <div
                        key={sch.id}
                        className={`p-4 rounded-2xl border transition ${
                          isCurrentlyRunning
                            ? 'bg-emerald-950/20 border-emerald-500/50'
                            : 'bg-zinc-900/80 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-white">
                              {sch.name}
                            </h4>
                            {isCurrentlyRunning && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                En Pantalla Ahora
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleScheduleActive(sch.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              sch.is_active
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {sch.is_active ? 'Activo' : 'Pausado'}
                          </button>
                        </div>

                        <div className="text-xs text-amber-400 font-mono font-bold mb-2">
                          ⏰ {sch.start_time} hrs — {sch.end_time} hrs (Lun a Dom)
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {sch.category_ids.map((cid) => {
                            const cat = state.categories.find(
                              (c) => c.id === cid
                            );
                            return (
                              <span
                                key={cid}
                                className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                              >
                                {cat?.name || cid}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleCreateSchedule}
                  className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 h-fit"
                >
                  <h3 className="font-bold text-base text-white">
                    Crear Nuevo Bloque Horario
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Nombre del Turno
                    </label>
                    <input
                      type="text"
                      value={newScheduleName}
                      onChange={(e) => setNewScheduleName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        value={newScheduleStart}
                        onChange={(e) => setNewScheduleStart(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Hora Fin
                      </label>
                      <input
                        type="time"
                        value={newScheduleEnd}
                        onChange={(e) => setNewScheduleEnd(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Categorías Visibles en este Horario
                    </label>
                    <div className="space-y-1.5">
                      {state.categories.map((cat) => {
                        const checked = newScheduleCategories.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewScheduleCategories([
                                    ...newScheduleCategories,
                                    cat.id,
                                  ]);
                                } else {
                                  setNewScheduleCategories(
                                    newScheduleCategories.filter(
                                      (id) => id !== cat.id
                                    )
                                  );
                                }
                              }}
                            />
                            {cat.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Guardar Regla Dayparting
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 7: POS WEBHOOKS & FDA COMPLIANCE
             ================================================================= */}
          {activeTab === 'pos_webhooks' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div>
                <h2 className="text-2xl font-black font-['Outfit'] text-white">
                  Integración POS en Tiempo Real &amp; Normativa FDA
                </h2>
                <p className="text-xs text-zinc-400">
                  Conecta Toast, Square o Clover mediante Webhooks y activa o desactiva el etiquetado de calorías según requiera tu negocio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-red-500" /> Simulador de Eventos Webhook POS
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      REST API Ready
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() =>
                        simulatePosWebhookEvent('Toast POS', '86_RANDOM')
                      }
                      className="w-full py-2.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                    >
                      <span>🔥 Simular Webhook Toast POS: Marcar Plato Agotado (86&apos;d)</span>
                      <span className="font-mono text-[10px]">&lt;100ms</span>
                    </button>

                    <button
                      onClick={() =>
                        simulatePosWebhookEvent(
                          'Square POS',
                          'HAPPY_HOUR_PRICES'
                        )
                      }
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                    >
                      <span>🍺 Simular Webhook Square POS: 20% OFF en Carta</span>
                      <span className="font-mono text-[10px]">OAuth 2.0</span>
                    </button>

                    <button
                      onClick={() =>
                        simulatePosWebhookEvent('Clover POS', 'RESTORE_ALL')
                      }
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                    >
                      <span>✅ Simular Webhook Clover POS: Restablecer Todo el Stock</span>
                      <span className="font-mono text-[10px]">Sync OK</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1">
                    <div className="text-zinc-300 font-bold">
                      POST https://btchfwzycgisperjgwqo.supabase.co/functions/v1/pos-webhook
                    </div>
                    <div>
                      Authorization: Bearer {state.organization.api_key}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-sky-400" /> Cumplimiento FDA (21 CFR 101.11)
                    </h3>
                    <button
                      onClick={() =>
                        updateOrganizationSettings({
                          fda_calorie_compliance:
                            !state.organization.fda_calorie_compliance,
                        })
                      }
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        state.organization.fda_calorie_compliance
                          ? 'bg-sky-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {state.organization.fda_calorie_compliance
                        ? 'Activado en Pantallas'
                        : 'Desactivado'}
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400">
                    Muestra las calorías junto al precio con igual prominencia tipográfica y añade las dos leyendas nutricionales al pie de pantalla.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB: GENERADOR DE CONTENIDO PARA INSTAGRAM CON NANO BANANA 2
             ================================================================= */}
          {activeTab === 'instagram_ai' && <InstagramContentGenerator />}
        </main>

        {/* RIGHT LIVE SPLIT-SCREEN DISPLAY PLAYER SIMULATOR */}
        {showSplitSimulator && (
          <div className="w-full lg:w-1/2 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-black flex flex-col h-[660px] lg:h-auto overflow-hidden">
            <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-white">
                  TV en Vivo ({state.organization.name}):
                </span>
                <select
                  value={effectivePreviewScreenId}
                  onChange={(e) => setCustomPreviewScreenId(e.target.value)}
                  className="bg-zinc-800 text-amber-300 font-semibold rounded px-2 py-0.5 border border-zinc-700 focus:outline-none"
                >
                  {state.screens.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.layout_template})
                    </option>
                  ))}
                </select>
              </div>
              <Link
                to={`/player?screen=${effectivePreviewScreenId}`}
                target="_blank"
                className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Pantalla Completa <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DisplayPlayerPage
                embeddedScreenId={effectivePreviewScreenId}
                embeddedMode={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* PRODUCT CREATE / EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProductModal}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-black text-white">
              {editingProduct.id ? 'Editar Producto' : 'Nuevo Producto en Carta'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nombre del Plato
                </label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Categoría
                </label>
                <select
                  value={editingProduct.category_id || state.categories[0]?.id}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Descripción Apetitosa
              </label>
              <textarea
                rows={2}
                value={editingProduct.description || ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    description: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Precio ({state.organization.currency_symbol})
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={editingProduct.price ?? 12.5}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Precio Promo (Opcional)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={editingProduct.promo_price ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      promo_price: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Calorías (FDA)
                </label>
                <input
                  type="number"
                  value={editingProduct.calories ?? 650}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      calories: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                URL de Imagen HD
              </label>
              <input
                type="url"
                value={editingProduct.image_url || ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    image_url: e.target.value,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
              >
                Guardar y Sincronizar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPER UI COMPONENTS
// ============================================================================
const ColorPickerField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
    <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none uppercase"
      />
    </div>
  </div>
);

const SidebarTabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: 'red' | 'amber' | 'emerald' | 'zinc';
}> = ({ active, onClick, icon, label, badge, badgeColor = 'zinc' }) => {
  const badgeClasses = {
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  }[badgeColor];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
        active
          ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
          : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </span>
      {badge && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
            active
              ? 'bg-black/30 text-white border-white/20'
              : badgeClasses
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

const KpiStatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
    <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
      <span className="font-semibold">{title}</span>
      <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
        {icon}
      </div>
    </div>
    <div className="text-xl font-black font-['Outfit'] text-white truncate">
      {value}
    </div>
    <div className="text-[11px] text-zinc-400 mt-1 truncate">{subtitle}</div>
  </div>
);
