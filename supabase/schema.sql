-- =============================================================================
-- RED LION MENUSYNC AI — ESQUEMA DE BASE DE DATOS POSTGRESQL + SUPABASE REALTIME
-- Proyecto: https://btchfwzycgisperjgwqo.supabase.co
-- Basado en el cuaderno NotebookLM: f6babc5a-d1d3-4ded-9c63-6587dd2c11c8
-- Soporta Personalización White-Label Multi-Cliente (Logo, Marca, Colores, QR)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (Multitenant / Cadenas / Restaurantes con White-Label Branding)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('starter', 'pro', 'business', 'enterprise')),
    hardware_modality TEXT NOT NULL DEFAULT 'haas_rental' CHECK (hardware_modality IN ('saas_byod', 'haas_rental', 'financing_12m')),
    setup_fee_usd NUMERIC(10, 2) NOT NULL DEFAULT 99.00,
    monthly_fee_usd NUMERIC(10, 2) NOT NULL DEFAULT 79.00,
    api_key TEXT UNIQUE NOT NULL DEFAULT ('rl_live_' || replace(uuid_generate_v4()::text, '-', '')),
    fda_calorie_compliance BOOLEAN NOT NULL DEFAULT true,
    currency_symbol TEXT NOT NULL DEFAULT '$',
    -- Configuración White-Label por cliente (Logo, Colores, Tipografía, Upsell, QR)
    branding JSONB NOT NULL DEFAULT '{
      "tagline": "100% Certified Angus Smash Burgers & Wood-Fired Brisket",
      "logo_url": "",
      "logo_icon_name": "Flame",
      "primary_color": "#dc2626",
      "accent_color": "#f59e0b",
      "background_color": "#09090b",
      "surface_color": "#18181b",
      "text_color": "#f4f4f5",
      "font_preset": "modern_outfit",
      "card_style": "glass_rounded",
      "show_product_images": true,
      "show_prices_with_tax_note": "Precios incluyen impuestos locales",
      "promo_upsell_Enabled": true,
      "promo_upsell_badge": "COMBO UPGRADE • UPSELL AUTOMÁTICO",
      "promo_upsell_title": "Hazlo Combo con Papas Trufadas + Pinta Artesanal",
      "promo_upsell_subtitle": "Agrega papas rústicas y bebida grande a cualquier Burger",
      "promo_upsell_price_text": "+$4.50",
      "custom_footer_text": "Ingredientes frescos seleccionados diariamente",
      "qr_menu_url": "https://menu.redliongrill.com",
      "show_qr_in_player": true
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BRANCHES (Sucursales con Zona Horaria para Dayparting)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    wifi_ssid TEXT DEFAULT 'RedLion_Signage_Private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SCREENS (Reproductores / Pantallas Kiosk 24/7)
CREATE TABLE IF NOT EXISTS public.screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pairing_code TEXT UNIQUE NOT NULL,
    is_paired BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline')),
    orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
    resolution TEXT NOT NULL DEFAULT '1920x1080 (Full HD)',
    layout_template TEXT NOT NULL DEFAULT 'split_promo' CHECK (layout_template IN ('classic_grid', 'split_promo', 'portrait_totem', 'drive_thru')),
    hardware_type TEXT NOT NULL DEFAULT 'Amazon Fire TV Stick 4K Max',
    is_outdoor_high_nits BOOLEAN NOT NULL DEFAULT false,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CATEGORIES (Categorías de Menú con Orden de Despliegue)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Utensils',
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS (Ítems de Menú, Precios, 86-ing en Tiempo Real y Calorías FDA)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    pos_external_id TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    promo_price NUMERIC(10, 2),
    calories INT NOT NULL DEFAULT 550,
    image_url TEXT NOT NULL,
    video_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SCHEDULES (Dayparting: Desayuno / Almuerzo / Cena / Happy Hour)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    screen_id UUID REFERENCES public.screens(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
    category_ids UUID[] NOT NULL DEFAULT '{}',
    layout_override TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FLASH PROMOTIONS (Ofertas Relámpago <100ms con Temporizador)
CREATE TABLE IF NOT EXISTS public.flash_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    badge_text TEXT NOT NULL DEFAULT 'OFERTA RELÁMPAGO',
    special_price NUMERIC(10, 2),
    duration_minutes INT NOT NULL DEFAULT 45,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 minutes'),
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACCESO
-- =============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and kiosk sync on organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on screens" ON public.screens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and kiosk sync on flash_promotions" ON public.flash_promotions FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- PUBLICACIÓN SUPABASE REALTIME (<100ms WebSockets)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_promotions;
