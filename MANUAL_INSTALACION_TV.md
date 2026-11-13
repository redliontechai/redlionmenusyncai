# 📺 Manual Técnico de Instalación de Pantallas TV y Reproductores
## **Red Lion MenuSync AI** — Guía de Campo para Técnicos e Instaladores

> **Propósito de este Manual:** Guía paso a paso para realizar el montaje físico, configuración eléctrica/red, desactivación del modo ahorro de energía (24/7), activación del **Modo Kiosk** y vinculación en `<30 segundos` de los televisores del restaurante.

---

## 🧰 1. Equipos y Materiales Necesarios Antes de Ir al Local

| Componente | Especificación Recomendada (Estándar Red Lion) | Propósito |
| :--- | :--- | :--- |
| **1. Pantalla / Monitor** | • **Interior (Mostrador/Salón):** Panel Comercial 43", 50" o 55" (`350–500 nits`, operación 16/7 o 24/7).<br>• **Exterior / Drive-Thru:** Panel Alto Brillo (`2,500 a 5,000 nits`) con gabinete sellado **IP65** (ej. *Samsung OH55A-S* / *OM55B*). | Visibilidad perfecta sin reflejos desde la fila de clientes. |
| **2. Reproductor (*Player*)** | • **Opción A (Recomendada):** *Amazon Signage Stick* o *Amazon Fire TV Stick 4K Max*.<br>• **Opción B:** *Android TV Box 4K* / *Chromecast con Google TV*.<br>• **Opción C:** *Raspberry Pi 5* con sistema Kiosk preinstalado. | Ejecutar la aplicación web `/player` con aceleración gráfica y caché *Offline* de 35 días. |
| **3. Alimentación USB** | Conectar el adaptador de corriente del Stick **directamente al tomacorriente de pared (o UPS)**, **NUNCA** al puerto USB del televisor. | Evita que el Stick se apague o reinicie lento y garantiza que descargue actualizaciones en segundo plano. |
| **4. Red / Conectividad** | • Cable **Ethernet Cat6** (con adaptador Ethernet para Fire TV) o<br>• Red WiFi privada **5 GHz** (`RedLion_Signage_Private`). | Aislar las pantallas del WiFi público de los clientes para garantizar sincronización en `<100ms`. |
| **5. Soporte de Pared/Techo** | Soporte VESA inclinable (`10° a 15°` hacia abajo si va sobre el mostrador) o soporte vertical rotativo (`90°`) para **Modo Tótem (Portrait 9:16)**. | Ergonomía visual y eliminación del reflejo de las lámparas del techo. |

---

## 📐 2. Montaje Físico y Orientación de las Pantallas

1. **Altura recomendada:** Entre `2.00 m y 2.20 m` desde el piso hasta el borde inferior del televisor para que los clientes de atrás vean el menú sin que las personas de adelante tapen la vista.
2. **Distancia entre pantallas múltiples (Menú de 2 o 3 TVs juntas):** Deja un margen uniforme de `1.5 cm a 2 cm` entre los marcos y usa un nivel láser para que las pantallas se lean como un solo tablero continuo.
3. **Cero cables visibles:** Oculta las regletas y el reproductor detrás del chasis VESA usando cinta Velcro industrial de doble cara.
4. **Verificación de reflejos:** Enciende la pantalla y obsérvala desde donde el cliente hace la fila. Si las luces del techo se reflejan en el panel, inclina el soporte `10° a 15°` hacia abajo.

---

## ⚙️ 3. Configuración del Televisor (Evitar que la TV se Apague Sola)

En todos los televisores debes desactivar el ahorro de energía y el apagado automático por inactividad:

1. **Modo de Imagen:** Selecciona **Estándar** o **Dinámico / Vívido** (en exteriores o lugares muy iluminados, sube la *Luz de Fondo / Brillo* al `90%–100%`).
2. **Desactivar Apagado Automático (Eco / Sleep Timer):**
   - Entra a **Configuración → General / Sistema → Solución Eco / Ahorro de Energía**.
   - **Apagado automático por inactividad (4 horas):** Cámbialo a **`DESACTIVADO (OFF)`**.
   - **Sensor de luz ambiental / Brillo Eco:** Cámbialo a **`DESACTIVADO (OFF)`**.
3. **Encendido Automático tras Corte Eléctrico (HDMI-CEC):**
   - Activa **HDMI-CEC** (*Anynet+* en Samsung, *Simplink* en LG) para que cuando el reproductor envíe señal de video, el televisor encienda automáticamente en ese puerto HDMI.

---

## 🔥 4. Configuración del Reproductor (Paso a Paso según Dispositivo)

### Opción A: Amazon Fire TV Stick 4K / Amazon Signage Stick

1. **Desactivar Protector de Pantalla:**
   - En el menú principal del Fire TV, ve a **Configuración (⚙️) → Pantalla y Sonido → Protector de pantalla**.
   - En **Iniciar protector de pantalla**, selecciona **`Nunca`**.
2. **Abrir el Menú Digital en Pantalla Completa:**
   - Abre el navegador **Amazon Silk** (o **Fully Kiosk Browser**).
   - Escribe la dirección de tu servidor seguida de `/player?pair=new`:
     ```text
     https://tudominio.com/player?pair=new
     ```
   - Guarda la página en **Favoritos / Marcadores** y activa el botón de **Pantalla Completa (`⛶`)**.

---

### Opción B: Android TV / Google TV Box (Con Inicio Automático al Encender)

1. Descarga **`Fully Kiosk Browser`** desde Google Play Store.
2. Configura los siguientes parámetros:
   - **Start URL:** `https://tudominio.com/player`
   - **Wait for Network Connection:** `ON`
   - **Keep Screen On (WakeLock):** `ON`
   - **Launch on Boot (Iniciar automáticamente al encender la TV):** `ON`

---

### Opción C: Raspberry Pi 5 (Modo Kiosk Chromium 24/7)

1. Edita el archivo de autoarranque:
   ```bash
   mkdir -p ~/.config/lxsession/LXDE-pi
   nano ~/.config/lxsession/LXDE-pi/autostart
   ```
2. Agrega:
   ```bash
   @xset s off
   @xset -dpms
   @xset s noblank
   @chromium-browser --noerrdialogs --disable-infobars --kiosk https://tudominio.com/player
   ```

---

## 🔗 5. Vinculación de la Pantalla con el Sistema (`<30 Segundos`)

1. Al abrir `/player?pair=new` en la TV, aparecerá un **Código de 6 caracteres** en letras amarillas gigantes (ejemplo: **`RL-4090`**).
2. Desde tu celular o laptop, entra a **`https://tudominio.com/admin`** → pestaña **📺 Pantallas & Pairing**.
3. En el formulario **"Vincular Nueva Pantalla"**:
   - **Código en Pantalla:** Ingresa el código (`RL-4090`).
   - **Nombre / Ubicación:** Ej. `Pantalla 1 — Mostrador Principal`.
   - **Orientación:** `Horizontal (16:9)` o `Vertical Tótem (9:16)`.
   - **Layout Multi-Zona:** Elige entre *Split 70/30 + Promo Loop*, *Carta Clásica 3 Columnas*, *Tótem Vertical 9:16* o *Drive-Thru Alto Contraste*.
4. Pulsa **"Vincular y Transmitir Menú Ahora"**.
5. **Espera 15 segundos con internet activo:** El televisor descargará automáticamente todas las fotos y datos en su memoria interna (`IndexedDB` + `Service Worker`) para poder operar hasta **35 días sin internet**.

---

## 🌐 6. Configuración de Red Recomendada en el Restaurante

- **Nunca conectes las pantallas al WiFi público de los clientes.**
- Activa en el router del local una red en banda **5 GHz** exclusiva para las pantallas (ej. **`RedLion_Signage_Private`**) o conecta las pantallas mediante cable **Ethernet Cat6**.

---

## ✅ 7. Checklist de Entrega en Sitio (Para Revisar antes de Salir del Local)

- [ ] **1. Montaje Físico y Nivelación:** Pantallas firmes, niveladas, sin cables visibles y con inclinación anti-reflejo (`10°–15°`).
- [ ] **2. Energía Independiente:** Reproductores conectados a corriente de pared/UPS (no al USB de la TV).
- [ ] **3. Ahorro de Energía Desactivado:** Apagado automático de 4 horas en `OFF` y protector de pantalla en `Nunca`.
- [ ] **4. Vinculación y Diseño:** Cada pantalla muestra su plantilla correcta y la marca/colores del restaurante.
- [ ] **5. Prueba en Vivo de `<100ms` frente al Cliente:** Se marcó un plato como **`86'd Agotado`** desde el celular y se comprobó que cambió al instante en la TV.
- [ ] **6. Prueba de Corte de Internet (*Offline Test*):** Se verificó que el caché local mantiene el menú activo sin conexión.

