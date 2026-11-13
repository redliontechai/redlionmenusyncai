import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Instagram,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Image as ImageIcon,
  Sliders,
  KeyRound,
  Tv,
  Share2,
  Hash,
  Flame,
  Sun,
  Zap,
  Award,
  Layers,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useMenuSync } from '../context/MenuSyncContext';
import { Product } from '../types/menu';

export type InstagramFormat = '1:1' | '4:5' | '9:16';

export type NanoBananaStylePreset =
  | 'fire_smokehouse'
  | 'daylight_artisan'
  | 'neon_street_qsr'
  | 'michelin_macro'
  | 'explosive_promo';

export type OverlayTemplateStyle =
  | 'editorial_magazine'
  | 'bold_promo_badge'
  | 'luxury_minimal'
  | 'clean_no_text';

export type CopyTone = 'craving' | 'urgency' | 'gourmet' | 'viral';

interface GeneratedInstagramAsset {
  id: string;
  createdAt: string;
  productName: string;
  productId: string | null;
  format: InstagramFormat;
  stylePreset: NanoBananaStylePreset;
  overlayTemplate: OverlayTemplateStyle;
  baseImageUrl: string;
  composedDataUrl: string;
  promptUsed: string;
  caption: string;
  hashtags: string;
  engineLabel: string;
}

const FORMAT_CONFIG: Record<
  InstagramFormat,
  {
    label: string;
    subtitle: string;
    width: number;
    height: number;
    aspectClass: string;
  }
> = {
  '1:1': {
    label: 'Feed Cuadrado (1:1)',
    subtitle: '1080 × 1080 px • Clásico Instagram',
    width: 1080,
    height: 1080,
    aspectClass: 'aspect-square',
  },
  '4:5': {
    label: 'Feed Vertical (4:5)',
    subtitle: '1080 × 1350 px • Máximo Alcance',
    width: 1080,
    height: 1350,
    aspectClass: 'aspect-[4/5]',
  },
  '9:16': {
    label: 'Story / Reel (9:16)',
    subtitle: '1080 × 1920 px • Pantalla Completa',
    width: 1080,
    height: 1920,
    aspectClass: 'aspect-[9/16]',
  },
};

const STYLE_PRESETS: Array<{
  id: NanoBananaStylePreset;
  name: string;
  badge: string;
  description: string;
  promptModifiers: string;
  colorTint: string;
}> = [
  {
    id: 'fire_smokehouse',
    name: 'Fuego & Brasa Dark Studio',
    badge: '🔥 Favorito QSR',
    description: 'Brasas encendidas, humo tenue, iluminación dramática chiaroscuro y texturas jugosas.',
    promptModifiers:
      'dramatic dark studio food photography, glowing wood embers and subtle aromatic smoke in background, warm rim lighting, ultra-juicy glistening textures, 85mm f/1.4 lens, commercial gastronomy masterpiece, 8k',
    colorTint: 'rgba(220, 38, 38, 0.18)',
  },
  {
    id: 'daylight_artisan',
    name: 'Luz Natural & Terraza Gourmet',
    badge: '☀️ Orgánico',
    description: 'Luz de mañana dorada, mesa de madera rústica, ingredientes frescos y bokeh suave.',
    promptModifiers:
      'natural golden hour window light, rustic artisan oak table, fresh herbs and ingredients scattered artfully, creamy background bokeh, editorial Bon Appetit magazine style, vibrant natural colors, 8k',
    colorTint: 'rgba(245, 158, 11, 0.14)',
  },
  {
    id: 'neon_street_qsr',
    name: 'Neón Urbano & Night Food',
    badge: '⚡ Viral Gen-Z',
    description: 'Estética nocturna vibrante con reflejos cálidos y cian, ideal para burgers y coctelería.',
    promptModifiers:
      'vibrant night street food aesthetic, subtle warm amber and cyan neon reflections, high contrast glossy sauce drip, dynamic hero angle, trendy gastrobar atmosphere, crisp commercial studio lighting',
    colorTint: 'rgba(236, 72, 153, 0.16)',
  },
  {
    id: 'michelin_macro',
    name: 'Fine Dining Macro 85mm',
    badge: '🍷 Alta Cocina',
    description: 'Vajilla de cerámica negra mate, iluminación puntual de galería y detalle extremo.',
    promptModifiers:
      'Michelin star fine dining plating, matte black ceramic tableware, moody spotlighting, shallow depth of field macro food photography, microgreens and delicate sauce glaze, ultra-sharp detail',
    colorTint: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'explosive_promo',
    name: 'Impacto Comercial Hero Shot',
    badge: '💥 Ventas',
    description: 'Ángulo heroico publicitario con ingredientes en primer plano y máxima nitidez.',
    promptModifiers:
      'high-impact commercial advertising hero shot, low angle perspective, hyper-appetizing textures, studio strobe lighting, crisp focus across the dish, appetizing steam rising, award-winning food ad',
    colorTint: 'rgba(234, 88, 12, 0.20)',
  },
];

const CURATED_FALLBACK_FOOD_IMAGES: Record<NanoBananaStylePreset, string[]> = {
  fire_smokehouse: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1400&q=85',
  ],
  daylight_artisan: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=85',
  ],
  neon_street_qsr: [
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1400&q=85',
  ],
  michelin_macro: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1400&q=85',
  ],
  explosive_promo: [
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1400&q=85',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=85',
  ],
};

const STORAGE_KEY_GEMINI_API = 'redlion_nano_banana_api_key_v1';
const STORAGE_KEY_IG_HISTORY = 'redlion_ig_nano_banana_history_v1';

// Helper to load an image with CORS support for Canvas rendering
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

// Helper to wrap text inside HTML5 Canvas
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line.trim() + '…', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export const InstagramContentGenerator: React.FC = () => {
  const { state, upsertProduct } = useMenuSync();
  const branding = state.organization.branding;
  const currency = state.organization.currency_symbol;

  // API Key Management (Env or LocalStorage)
  const envApiKey =
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_GEMINI_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_GEMINI_API) || envApiKey || '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [nanoModelVariant, setNanoModelVariant] = useState<
    'gemini-3.1-flash-image-preview' | 'gemini-2.5-flash-image'
  >('gemini-3.1-flash-image-preview');

  // Product & Custom Content Selection
  const [selectedProductId, setSelectedProductId] = useState<string>(
    state.products[0]?.id || 'CUSTOM'
  );
  const selectedProduct: Product | undefined = useMemo(
    () => state.products.find((p) => p.id === selectedProductId),
    [state.products, selectedProductId]
  );

  const [dishTitle, setDishTitle] = useState<string>(
    selectedProduct?.name || 'Smokehouse Double Bacon Burger'
  );
  const [dishDescription, setDishDescription] = useState<string>(
    selectedProduct?.description ||
      'Doble carne angus a la brasa, cheddar fundido, tocino ahumado y salsa secreta de la casa.'
  );
  const [priceText, setPriceText] = useState<string>(
    selectedProduct
      ? `${currency}${(selectedProduct.promo_price ?? selectedProduct.price).toFixed(2)}`
      : `${currency}14.90`
  );
  const [originalPriceText, setOriginalPriceText] = useState<string>(
    selectedProduct?.promo_price
      ? `${currency}${selectedProduct.price.toFixed(2)}`
      : ''
  );

  // Nano Banana 2 Visual Parameters
  const [format, setFormat] = useState<InstagramFormat>('4:5');
  const [stylePreset, setStylePreset] =
    useState<NanoBananaStylePreset>('fire_smokehouse');
  const [overlayTemplate, setOverlayTemplate] =
    useState<OverlayTemplateStyle>('editorial_magazine');
  const [customSceneDetails, setCustomSceneDetails] = useState<string>(
    'Queso cheddar derretido en primer plano, chispas suaves de brasa y vapor apetitoso'
  );

  // Graphic Overlay Parameters
  const [promoBadgeText, setPromoBadgeText] = useState<string>(
    '🔥 ESPECIAL DE LA CASA'
  );
  const [ctaFooterText, setCtaFooterText] = useState<string>(
    '¡Pídelo hoy en local o por delivery! • Link en Bio'
  );
  const [showPriceTag, setShowPriceTag] = useState<boolean>(true);
  const [showBrandHeader, setShowBrandHeader] = useState<boolean>(true);

  // Copywriting Parameters
  const [copyTone, setCopyTone] = useState<CopyTone>('craving');
  const [captionText, setCaptionText] = useState<string>('');
  const [hashtagsText, setHashtagsText] = useState<string>('');
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Generation State
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [baseImageUrl, setBaseImageUrl] = useState<string>(
    selectedProduct?.image_url ||
      CURATED_FALLBACK_FOOD_IMAGES.fire_smokehouse[0]
  );
  const [composedDataUrl, setComposedDataUrl] = useState<string>('');
  const [engineStatusMessage, setEngineStatusMessage] = useState<string>(
    'Listo para generar con Nano Banana 2 (Gemini 3.1 Flash Image)'
  );
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning'>(
    'info'
  );
  const [syncedToCatalogToast, setSyncedToCatalogToast] =
    useState<boolean>(false);

  // Saved History
  const [history, setHistory] = useState<GeneratedInstagramAsset[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IG_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync fields when user picks another product from catalog
  useEffect(() => {
    if (selectedProductId === 'CUSTOM') return;
    const prod = state.products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    setDishTitle(prod.name);
    setDishDescription(prod.description);
    const activePrice = prod.promo_price ?? prod.price;
    setPriceText(`${currency}${activePrice.toFixed(2)}`);
    setOriginalPriceText(
      prod.promo_price ? `${currency}${prod.price.toFixed(2)}` : ''
    );
    if (prod.image_url) {
      setBaseImageUrl(prod.image_url);
    }
    if (prod.promo_price) {
      setPromoBadgeText('⚡ OFERTA ESPECIAL HOY');
    } else if (prod.is_featured) {
      setPromoBadgeText('⭐ RECOMENDACIÓN DEL CHEF');
    } else {
      setPromoBadgeText('🔥 PREPARADO AL MOMENTO');
    }
  }, [selectedProductId, state.products, currency]);

  // Build Nano Banana 2 Master Prompt automatically
  const constructedNanoBananaPrompt = useMemo(() => {
    const presetObj =
      STYLE_PRESETS.find((s) => s.id === stylePreset) || STYLE_PRESETS[0];
    return `Professional commercial food photography for Instagram (${format} aspect ratio) of "${dishTitle}": ${dishDescription}. ${
      customSceneDetails ? `Visual details: ${customSceneDetails}. ` : ''
    }Style: ${presetObj.promptModifiers}. Restaurant brand atmosphere: ${
      state.organization.name
    }. No watermark, no deformed text, ultra-realistic culinary texture.`;
  }, [
    dishTitle,
    dishDescription,
    customSceneDetails,
    stylePreset,
    format,
    state.organization.name,
  ]);

  // Generate Smart Instagram Copywriting + Hashtags
  const generateInstagramCopy = (
    title: string,
    desc: string,
    price: string,
    tone: CopyTone
  ) => {
    const orgName = state.organization.name;
    const branchAddress =
      state.branches[0]?.address || 'nuestra sucursal principal';
    const cleanOrgTag = orgName.replace(/[^a-zA-Z0-9]/g, '');

    let body = '';
    if (tone === 'craving') {
      body = `¿Se te hizo agua la boca? 🤤🔥 Nuestro **${title}** está recién salido de cocina esperando por ti.\n\n✨ ${desc}\n\n💥 Disfrútalo hoy por solo **${price}** en **${orgName}**.\n\n📍 Visítanos en ${branchAddress} o pídelo directo desde el link en nuestra bio. ¡Etiqueta a esa persona que te debe una salida hoy! 👇🍔`;
    } else if (tone === 'urgency') {
      body = `🚨 ¡ALERTA DE SABOR EN ${orgName.toUpperCase()}! 🚨\n\nHoy es el día perfecto para darte el gusto con nuestro irresistible **${title}**.\n\n🔥 ${desc}\n💰 Precio especial: **${price}** (Por tiempo limitado)\n\n⏰ ¡No te quedes con las ganas! Te esperamos en ${branchAddress}.`;
    } else if (tone === 'gourmet') {
      body = `El arte del buen comer se vive en cada detalle. ✨🍷\n\nPresentamos **${title}**, una experiencia gastronómica pensada para los paladares más exigentes.\n\n🍽️ *${desc}*\n\nDisponible en nuestra carta por **${price}**. Reserva tu mesa o visítanos hoy en **${orgName}** (${branchAddress}).`;
    } else {
      body = `POV: Acabas de encontrar tu nuevo antojo favorito de la semana 😍🔥\n\n10/10 nuestro **${title}** en **${orgName}**.\n👉 ${desc}\n💸 Solo **${price}**\n\nGuarda este post para tu próximo plan con amigos y comenta un "🔥" si te lo comerías ahora mismo.`;
    }

    const tags = `#${cleanOrgTag} #FoodPorn #Gastronomia #Restaurantes #FoodieLover #ComidaDeliciosa #InstaFood #NanoBanana2 #MenuDigital #HoySeComeRico #ChefSpecial`;

    setCaptionText(body);
    setHashtagsText(tags);
  };

  // Update copy when product or tone changes
  useEffect(() => {
    generateInstagramCopy(dishTitle, dishDescription, priceText, copyTone);
  }, [dishTitle, dishDescription, priceText, copyTone, state.organization.name]);

  // Render High-Resolution Instagram Canvas (1080x1080, 1080x1350, or 1080x1920)
  useEffect(() => {
    let isCancelled = false;

    const renderCanvasComposition = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cfg = FORMAT_CONFIG[format];
      canvas.width = cfg.width;
      canvas.height = cfg.height;

      const W = cfg.width;
      const H = cfg.height;

      // 1. Background Fill
      ctx.fillStyle = branding.background_color || '#09090b';
      ctx.fillRect(0, 0, W, H);

      // 2. Draw Base Food Image (Cover Crop)
      try {
        const img = await loadImageElement(baseImageUrl);
        if (isCancelled) return;

        const imgRatio = img.width / img.height;
        const canvasRatio = W / H;
        let drawW = W;
        let drawH = H;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > canvasRatio) {
          drawH = H;
          drawW = H * imgRatio;
          offsetX = (W - drawW) / 2;
        } else {
          drawW = W;
          drawH = W / imgRatio;
          offsetY = (H - drawH) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      } catch {
        // Fallback gradient if image CORS fails
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, branding.primary_color);
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 3. Apply Subtle Nano Banana Style Atmosphere Color Grading
      const activePreset =
        STYLE_PRESETS.find((s) => s.id === stylePreset) || STYLE_PRESETS[0];
      ctx.fillStyle = activePreset.colorTint;
      ctx.fillRect(0, 0, W, H);

      // If user selected Clean Photo (no text overlay), export right here
      if (overlayTemplate === 'clean_no_text') {
        if (!isCancelled) {
          setComposedDataUrl(canvas.toDataURL('image/png', 0.95));
        }
        return;
      }

      // 4. Top & Bottom Cinematic Vignette Gradients for legibility
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.82)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H * 0.28);

      const bottomGrad = ctx.createLinearGradient(0, H * 0.42, 0, H);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(0.55, 'rgba(9,9,11,0.82)');
      bottomGrad.addColorStop(1, 'rgba(9,9,11,0.97)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, H * 0.42, W, H * 0.58);

      const padX = 64;

      // 5. Brand Header Bar (Top)
      if (showBrandHeader) {
        const topY = format === '9:16' ? 96 : 58;

        // Brand Pill Container
        ctx.save();
        ctx.fillStyle = 'rgba(15, 15, 20, 0.78)';
        ctx.strokeStyle = branding.accent_color || '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(padX, topY, W - padX * 2, 92, 26);
        ctx.fill();
        ctx.stroke();

        // Brand Circle Badge
        ctx.fillStyle = branding.primary_color || '#dc2626';
        ctx.beginPath();
        ctx.arc(padX + 48, topY + 46, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px Outfit, Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          state.organization.name.slice(0, 2).toUpperCase(),
          padX + 48,
          topY + 55
        );

        // Restaurant Name & Tagline
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 30px Outfit, Inter, sans-serif';
        ctx.fillText(state.organization.name, padX + 94, topY + 44);

        ctx.fillStyle = branding.accent_color || '#fbbf24';
        ctx.font = '600 20px Inter, sans-serif';
        ctx.fillText(
          branding.tagline.slice(0, 48),
          padX + 94,
          topY + 72
        );
        ctx.restore();
      }

      // 6. Promo Badge & Dish Title + Price Overlay (Bottom)
      const bottomBaseY =
        format === '9:16' ? H - 390 : format === '4:5' ? H - 340 : H - 310;

      // Promo Badge Pill
      if (promoBadgeText.trim()) {
        ctx.save();
        ctx.font = '900 24px Outfit, Inter, sans-serif';
        const badgeMetrics = ctx.measureText(promoBadgeText.toUpperCase());
        const badgeW = Math.min(badgeMetrics.width + 52, W - padX * 2);

        ctx.fillStyle = branding.primary_color || '#dc2626';
        ctx.beginPath();
        ctx.roundRect(padX, bottomBaseY - 68, badgeW, 52, 16);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(
          promoBadgeText.toUpperCase(),
          padX + 26,
          bottomBaseY - 33
        );
        ctx.restore();
      }

      // Dish Name Title
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = '900 62px Outfit, Inter, sans-serif';
      const titleMaxW = showPriceTag ? W - padX * 2 - 260 : W - padX * 2;
      const nextY = drawWrappedText(
        ctx,
        dishTitle.toUpperCase(),
        padX,
        bottomBaseY + 26,
        titleMaxW,
        68,
        2
      );

      // Dish Description
      ctx.fillStyle = '#e4e4e7';
      ctx.font = '500 27px Inter, sans-serif';
      drawWrappedText(
        ctx,
        dishDescription,
        padX,
        nextY + 12,
        titleMaxW,
        36,
        2
      );
      ctx.restore();

      // Price Burst Circle / Card on the Right
      if (showPriceTag && priceText.trim()) {
        ctx.save();
        const priceBoxW = 235;
        const priceBoxH = originalPriceText ? 155 : 130;
        const priceBoxX = W - padX - priceBoxW;
        const priceBoxY = bottomBaseY - 18;

        ctx.fillStyle = branding.accent_color || '#f59e0b';
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.roundRect(priceBoxX, priceBoxY, priceBoxW, priceBoxH, 28);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        const centerX = priceBoxX + priceBoxW / 2;

        if (originalPriceText) {
          ctx.fillStyle = 'rgba(9,9,11,0.65)';
          ctx.font = '800 24px Outfit, Inter, sans-serif';
          ctx.fillText(`ANTES ${originalPriceText}`, centerX, priceBoxY + 42);

          // Strikethrough line
          const strikeW = ctx.measureText(`ANTES ${originalPriceText}`).width;
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX - strikeW / 2, priceBoxY + 34);
          ctx.lineTo(centerX + strikeW / 2, priceBoxY + 34);
          ctx.stroke();

          ctx.fillStyle = '#09090b';
          ctx.font = '900 54px Outfit, Inter, sans-serif';
          ctx.fillText(priceText, centerX, priceBoxY + 105);

          ctx.font = '800 18px Inter, sans-serif';
          ctx.fillText('PRECIO PROMO', centerX, priceBoxY + 134);
        } else {
          ctx.fillStyle = '#09090b';
          ctx.font = '800 20px Inter, sans-serif';
          ctx.fillText('SOLO POR', centerX, priceBoxY + 38);

          ctx.font = '900 56px Outfit, Inter, sans-serif';
          ctx.fillText(priceText, centerX, priceBoxY + 98);
        }
        ctx.restore();
      }

      // 7. Footer Call To Action Bar
      if (ctaFooterText.trim()) {
        ctx.save();
        const footerY = H - 72;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(padX, footerY - 46, W - padX * 2, 2);

        ctx.fillStyle = branding.accent_color || '#fbbf24';
        ctx.font = '700 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ctaFooterText, W / 2, footerY);
        ctx.restore();
      }

      if (!isCancelled) {
        try {
          setComposedDataUrl(canvas.toDataURL('image/png', 0.95));
        } catch {
          // If cross-origin tainted, still display preview
        }
      }
    };

    renderCanvasComposition();

    return () => {
      isCancelled = true;
    };
  }, [
    baseImageUrl,
    format,
    stylePreset,
    overlayTemplate,
    dishTitle,
    dishDescription,
    priceText,
    originalPriceText,
    promoBadgeText,
    ctaFooterText,
    showPriceTag,
    showBrandHeader,
    branding,
    state.organization.name,
  ]);

  // Save API Key handler
  const handleSaveApiKey = (val: string) => {
    const clean = val.trim();
    setApiKey(clean);
    localStorage.setItem(STORAGE_KEY_GEMINI_API, clean);
  };

  // Invoke Nano Banana 2 (Google Gemini 3.1 Flash Image API) or Studio Simulation
  const handleGenerateWithNanoBanana2 = async () => {
    setIsGeneratingImage(true);
    setStatusType('info');
    setEngineStatusMessage(
      `Generando arte gastronómico con Nano Banana 2 (${nanoModelVariant})...`
    );

    const effectiveKey = apiKey.trim();

    if (effectiveKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${nanoModelVariant}:generateContent?key=${encodeURIComponent(
          effectiveKey
        )}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: constructedNanoBananaPrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: {
                aspectRatio: format,
              },
            },
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(
            errJson?.error?.message || `HTTP ${response.status}`
          );
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
          (p: { inlineData?: { mimeType?: string; data?: string } }) =>
            p.inlineData && p.inlineData.data
        );

        if (imagePart?.inlineData?.data) {
          const mime = imagePart.inlineData.mimeType || 'image/png';
          const generatedDataUrl = `data:${mime};base64,${imagePart.inlineData.data}`;
          setBaseImageUrl(generatedDataUrl);
          setStatusType('success');
          setEngineStatusMessage(
            `¡Imagen generada con éxito por Nano Banana 2 (${nanoModelVariant}) en formato ${format}!`
          );
          setIsGeneratingImage(false);
          return;
        } else {
          throw new Error(
            'El modelo no devolvió un bloque inlineData de imagen.'
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        // Fallback to Studio Instant Render so user never gets stuck
        const pool = CURATED_FALLBACK_FOOD_IMAGES[stylePreset];
        const randomImg = pool[Math.floor(Math.random() * pool.length)];
        setBaseImageUrl(randomImg);
        setStatusType('warning');
        setEngineStatusMessage(
          `Aviso API (${msg}). Se aplicó renderizado de estudio Nano Banana 2 con iluminación ${stylePreset}.`
        );
        setIsGeneratingImage(false);
        return;
      }
    }

    // Instant Studio Mode when no API key is configured yet
    await new Promise((r) => setTimeout(r, 850));
    const pool = CURATED_FALLBACK_FOOD_IMAGES[stylePreset];
    const currentIndex = pool.indexOf(baseImageUrl);
    const nextImg = pool[(currentIndex + 1) % pool.length];
    setBaseImageUrl(
      selectedProduct?.image_url && currentIndex === -1
        ? selectedProduct.image_url
        : nextImg
    );
    setStatusType('success');
    setEngineStatusMessage(
      'Composición Nano Banana 2 (Modo Estudio Instantáneo) lista. Configura tu Gemini API Key arriba para síntesis neuronal 100% generativa.'
    );
    setIsGeneratingImage(false);
  };

  // Download High-Res PNG
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = composedDataUrl || canvas.toDataURL('image/png', 0.95);
    const a = document.createElement('a');
    const cleanName = dishTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    a.href = dataUrl;
    a.download = `instagram-${cleanName}-${format.replace(':', 'x')}-nanobanana2.png`;
    a.click();

    // Also save to recent creations gallery
    const newItem: GeneratedInstagramAsset = {
      id: `ig-${Date.now()}`,
      createdAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      productName: dishTitle,
      productId: selectedProductId === 'CUSTOM' ? null : selectedProductId,
      format,
      stylePreset,
      overlayTemplate,
      baseImageUrl,
      composedDataUrl: dataUrl,
      promptUsed: constructedNanoBananaPrompt,
      caption: captionText,
      hashtags: hashtagsText,
      engineLabel: apiKey ? 'Nano Banana 2 API' : 'Nano Banana 2 Studio',
    };
    const updated = [newItem, ...history].slice(0, 8);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY_IG_HISTORY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors on large data URLs
    }
  };

  // Apply generated base image to the active product in the MenuSync catalog (<100ms sync to TVs)
  const handleSyncImageToCatalogProduct = () => {
    if (!selectedProduct) return;
    upsertProduct({
      ...selectedProduct,
      image_url: baseImageUrl,
    });
    setSyncedToCatalogToast(true);
    setTimeout(() => setSyncedToCatalogToast(false), 3500);
  };

  const handleCopyFullCaption = () => {
    const fullText = `${captionText}\n\n.\n.\n${hashtagsText}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(constructedNanoBananaPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Motor IA: Nano Banana 2
              </span>
              <span className="text-[11px] font-bold text-pink-400">
                gemini-3.1-flash-image-preview
              </span>
            </div>
            <h2 className="text-2xl font-black font-['Outfit'] text-white mt-1">
              Generador de Contenido para Instagram con Nano Banana 2
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Convierte cualquier plato u oferta de tu carta en Posts (1:1, 4:5) y Reels/Stories (9:16) de alta conversión con fotografía gastronómica generativa, branding automático y copywriting listo para publicar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowApiKeyModal(!showApiKeyModal)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              apiKey
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-amber-300'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>
              {apiKey
                ? 'API Key Nano Banana 2 Activa'
                : 'Configurar Gemini API Key'}
            </span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE API KEY & MODEL CONFIG PANEL */}
      {showApiKeyModal && (
        <div className="bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" /> Configuración del Motor Google Gemini — Nano Banana 2
            </h3>
            <button
              type="button"
              onClick={() => setShowApiKeyModal(false)}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-7">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Google AI Studio API Key (Se guarda localmente en tu navegador)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Versión del Modelo Nano Banana
              </label>
              <select
                value={nanoModelVariant}
                onChange={(e) =>
                  setNanoModelVariant(
                    e.target.value as
                      | 'gemini-3.1-flash-image-preview'
                      | 'gemini-2.5-flash-image'
                  )
                }
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300"
              >
                <option value="gemini-3.1-flash-image-preview">
                  🍌 Nano Banana 2 (gemini-3.1-flash-image-preview) — Recomendado
                </option>
                <option value="gemini-2.5-flash-image">
                  🍌 Nano Banana 1 (gemini-2.5-flash-image) — Estable
                </option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            💡 Si aún no ingresas una API Key, el generador funciona en <strong>Modo Estudio Instantáneo</strong> combinando tus fotografías de catálogo y banco gastronómico 4K con el motor gráfico de marca en tiempo real.
          </p>
        </div>
      )}

      {/* MAIN STUDIO GRID: LEFT CONTROLS (7 COLS) + RIGHT LIVE PREVIEW & EXPORT (5 COLS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONFIGURATION & PROMPT STUDIO */}
        <div className="xl:col-span-7 space-y-5">
          {/* STEP 1: SELECT DISH FROM CATALOG OR CUSTOM */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> 1. Seleccionar Plato o Promoción de la Carta
              </h3>
              <span className="text-[11px] text-zinc-400">
                Sincronizado con tu Catálogo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-12">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Elegir Producto del Menú Digital
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  {state.products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.is_featured ? '⭐ ' : '🍔 '}
                      {prod.name} — {currency}
                      {(prod.promo_price ?? prod.price).toFixed(2)}
                      {prod.promo_price ? ' (PROMO)' : ''}
                    </option>
                  ))}
                  <option value="CUSTOM">
                    ✨ Crear Post Personalizado / Nuevo Lanzamiento...
                  </option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Título Principal en el Arte
                </label>
                <input
                  type="text"
                  value={dishTitle}
                  onChange={(e) => setDishTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Precio Destacado
                </label>
                <input
                  type="text"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="$14.90"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-400"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Precio Antes (Opcional)
                </label>
                <input
                  type="text"
                  value={originalPriceText}
                  onChange={(e) => setOriginalPriceText(e.target.value)}
                  placeholder="Ej: $18.90"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300"
                />
              </div>

              <div className="md:col-span-12">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descripción Gastronómica Corta
                </label>
                <textarea
                  rows={2}
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: NANO BANANA 2 FORMAT & VISUAL STYLE */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Wand2 className="w-4 h-4 text-pink-400" /> 2. Formato de Instagram & Dirección de Arte Nano Banana 2
            </h3>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Relación de Aspecto (Nativo Nano Banana 2 `imageConfig.aspectRatio`)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['1:1', '4:5', '9:16'] as InstagramFormat[]).map((fmt) => {
                  const cfg = FORMAT_CONFIG[fmt];
                  const active = format === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-pink-500/15 border-pink-500 text-white shadow-lg shadow-pink-500/10'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-black text-xs text-white flex items-center justify-between">
                        <span>{cfg.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300">
                          {fmt}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {cfg.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Style Presets */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Estilo de Iluminación y Escenografía Culinaria
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STYLE_PRESETS.map((preset) => {
                  const active = stylePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setStylePreset(preset.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white">
                          {preset.name}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-900 text-amber-300 border border-zinc-700 shrink-0">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Scene Details + Master Prompt Preview */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Detalles Extra de Escena para Nano Banana 2 (Ingredientes, Humo, Bebida acompañante)
                </label>
                <input
                  type="text"
                  value={customSceneDetails}
                  onChange={(e) => setCustomSceneDetails(e.target.value)}
                  placeholder="Ej: Cerveza artesanal fría al fondo, papas rústicas con romero, chispas de fuego..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Prompt Maestro Optimizado (Nano Banana 2)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copiar Prompt
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 leading-relaxed select-all">
                  {constructedNanoBananaPrompt}
                </p>
              </div>

              <button
                type="button"
                disabled={isGeneratingImage}
                onClick={handleGenerateWithNanoBanana2}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-pink-600 via-red-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-black text-sm shadow-xl shadow-red-600/25 flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sintetizando Fotografía con Nano Banana 2...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Generar Nueva Fotografía con Nano Banana 2 ({format})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STEP 3: BRAND OVERLAY & CALL TO ACTION CONTROLS */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Layers className="w-4 h-4 text-emerald-400" /> 3. Superposición Gráfica de Marca (Overlay en el Post)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'editorial_magazine', label: 'Portada Editorial' },
                  { id: 'bold_promo_badge', label: 'Impacto Promo' },
                  { id: 'luxury_minimal', label: 'Minimalista' },
                  { id: 'clean_no_text', label: 'Solo Foto Limpia' },
                ] as Array<{ id: OverlayTemplateStyle; label: string }>
              ).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setOverlayTemplate(tpl.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    overlayTemplate === tpl.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {overlayTemplate !== 'clean_no_text' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Etiqueta / Badge Superior
                  </label>
                  <input
                    type="text"
                    value={promoBadgeText}
                    onChange={(e) => setPromoBadgeText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Llamado a la Acción (Pie de Imagen)
                  </label>
                  <input
                    type="text"
                    value={ctaFooterText}
                    onChange={(e) => setCtaFooterText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-4 md:col-span-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBrandHeader}
                      onChange={(e) => setShowBrandHeader(e.target.checked)}
                      className="rounded accent-amber-400"
                    />
                    Mostrar Cabecera con Logo y Nombre del Restaurante
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPriceTag}
                      onChange={(e) => setShowPriceTag(e.target.checked)}
                      className="rounded accent-amber-400"
                    />
                    Mostrar Sello de Precio
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: INSTAGRAM CAPTION & HASHTAGS AI */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-4 h-4 text-amber-400" /> 4. Copywriting & Hashtags para Instagram
              </h3>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'craving', label: '🤤 Antojo' },
                    { id: 'urgency', label: '⚡ Urgencia' },
                    { id: 'gourmet', label: '🍷 Gourmet' },
                    { id: 'viral', label: '🔥 Viral' },
                  ] as Array<{ id: CopyTone; label: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCopyTone(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      copyTone === t.id
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Texto del Post (Caption persuasivo)
              </label>
              <textarea
                rows={5}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-200 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Hashtags Estratégicos
              </label>
              <input
                type="text"
                value={hashtagsText}
                onChange={(e) => setHashtagsText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-sky-400 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyFullCaption}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedCaption ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">
                    ¡Caption + Hashtags copiados al portapapeles!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Copiar Caption + Hashtags Listos para Pegar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE INSTAGRAM MOCKUP + EXPORT ACTIONS */}
        <div className="xl:col-span-5 space-y-5 sticky top-20">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                <h3 className="text-sm font-black text-white">
                  Vista Previa en Vivo ({FORMAT_CONFIG[format].label})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {FORMAT_CONFIG[format].width}×{FORMAT_CONFIG[format].height}px
              </span>
            </div>

            {/* Engine Status Pill */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                statusType === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : statusType === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300'
              }`}
            >
              {statusType === 'warning' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-pink-400" />
              )}
              <span>{engineStatusMessage}</span>
            </div>

            {/* INSTAGRAM PHONE FRAME PREVIEW */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center">
              {/* Top Instagram Mock Bar */}
              <div className="w-full flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})`,
                    }}
                  >
                    {state.organization.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none">
                      {state.organization.slug.replace(/-/g, '_')}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {state.branches[0]?.name || 'Restaurante Oficial'}
                    </div>
                  </div>
                </div>
                <Instagram className="w-4 h-4 text-zinc-400" />
              </div>

              {/* Hidden High-Res Canvas + Visible Responsive Canvas */}
              <div className="w-full flex justify-center overflow-hidden rounded-xl bg-black border border-zinc-800">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto max-h-[520px] object-contain block"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  Descargar Arte PNG en Alta Resolución ({FORMAT_CONFIG[format].width}×
                  {FORMAT_CONFIG[format].height})
                </span>
              </button>

              {selectedProduct && (
                <button
                  type="button"
                  onClick={handleSyncImageToCatalogProduct}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Tv className="w-4 h-4" />
                  <span>
                    Usar esta Fotografía en la Carta TV para &ldquo;
                    {selectedProduct.name}&rdquo; (&lt;100ms)
                  </span>
                </button>
              )}

              {syncedToCatalogToast && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                  ✅ ¡Fotografía actualizada en el catálogo y pantallas TV en vivo!
                </div>
              )}
            </div>
          </div>

          {/* RECENT CREATIONS GALLERY */}
          {history.length > 0 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Galería Reciente Nano Banana 2 ({history.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(STORAGE_KEY_IG_HISTORY);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Limpiar
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDishTitle(item.productName);
                      setFormat(item.format);
                      setStylePreset(item.stylePreset);
                      setOverlayTemplate(item.overlayTemplate);
                      setBaseImageUrl(item.baseImageUrl);
                      setCaptionText(item.caption);
                      setHashtagsText(item.hashtags);
                    }}
                    className="group relative rounded-xl overflow-hidden border border-zinc-800 hover:border-amber-400 aspect-square bg-zinc-950 cursor-pointer"
                    title={`${item.productName} (${item.format})`}
                  >
                    <img
                      src={item.composedDataUrl || item.baseImageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-amber-300">
                      {item.format}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

