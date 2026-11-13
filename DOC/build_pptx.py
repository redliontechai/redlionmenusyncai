# -*- coding: utf-8 -*-
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

out_dir = r"D:\APP\IA\MENU\DOC"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "Presentacion_Red_Lion_Tech_Solutions.pptx")

RED   = RGBColor(0xC8, 0x10, 0x10)
DARK  = RGBColor(0x22, 0x22, 0x22)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG    = RGBColor(0xF5, 0xF5, 0xF5)
ORANGE= RGBColor(0xE8, 0x5D, 0x1A)
GRAY  = RGBColor(0x66, 0x66, 0x66)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]

def add_rect(slide, x, y, w, h, color, line=False):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    if not line:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp

def add_text(slide, x, y, w, h, text, size=18, color=DARK, bold=False, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, font="Calibri", line_spacing=1.0, space_after=4):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Pt(2); tf.margin_right = Pt(2)
    tf.margin_top = Pt(1); tf.margin_bottom = Pt(1)
    lines = text.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        r = p.add_run()
        r.text = ln
        f = r.font
        f.size = Pt(size); f.color.rgb = color; f.bold = bold; f.name = font
    return tb

def add_bullet_list(slide, x, y, w, h, items, size=16, color=DARK, space_after=8, line_spacing=1.1):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(2); tf.margin_right = Pt(2)
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = line_spacing
        p.space_after = Pt(space_after)
        r = p.add_run()
        r.text = chr(0x25CF) + "  " + item
        r.font.size = Pt(size); r.font.color.rgb = color; r.font.name = "Calibri"
    return tb

def add_notes(slide, text):
    tf = slide.notes_slide.notes_text_frame
    tf.text = text

def header_bar(slide, title_text, subtitle_text=None):
    add_rect(slide, 0, 0, prs.slide_width, Inches(1.15), RED)
    add_rect(slide, 0, Inches(1.15), prs.slide_width, Inches(0.06), ORANGE)
    add_text(slide, Inches(0.5), Inches(0.12), prs.slide_width - Inches(1), Inches(0.65),
             title_text, size=26, color=WHITE, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle_text:
        add_text(slide, Inches(0.55), Inches(0.7), prs.slide_width - Inches(1), Inches(0.4),
                 subtitle_text, size=13, color=RGBColor(0xFF, 0xCC, 0xCC))

def footer(slide, page):
    add_text(slide, Inches(0.4), prs.slide_height - Inches(0.45), Inches(8), Inches(0.3),
             "Red Lion Tech Solutions  |  Proyecto UNO  |  Menus Digitales", size=9, color=GRAY)
    add_text(slide, prs.slide_width - Inches(1.5), prs.slide_height - Inches(0.45), Inches(1.1), Inches(0.3),
             str(page), size=9, color=GRAY, align=PP_ALIGN.RIGHT)

# ===== SLIDE 1 — Portada =====
s = prs.slides.add_slide(blank)
add_rect(s, 0, 0, prs.slide_width, prs.slide_height, DARK)
add_rect(s, 0, 0, prs.slide_width, Inches(0.25), RED)
add_rect(s, 0, prs.slide_height - Inches(0.25), prs.slide_width, Inches(0.25), RED)
add_text(s, Inches(0.8), Inches(0.7), Inches(8), Inches(0.6),
         "RED LION TECH SOLUTIONS", size=18, color=ORANGE, bold=True)
add_rect(s, Inches(0.85), Inches(1.55), Inches(2.2), Inches(0.05), ORANGE)

add_text(s, Inches(0.8), Inches(2.6), Inches(11.5), Inches(2.0),
         "Menus Digitales\ncon Propósito", size=54, color=WHITE, bold=True, line_spacing=1.0)
add_text(s, Inches(0.85), Inches(4.6), Inches(11), Inches(0.6),
         "Para tiendas de abarrotes y restaurantes pequeños", size=24, color=RGBColor(0xCC, 0xCC, 0xCC))
add_text(s, Inches(0.85), Inches(5.7), Inches(8), Inches(0.4),
         "Georgia, EE.UU.  |  Proyecto UNO  |  Presentacion hispana", size=15, color=RGBColor(0x99, 0x99, 0x99))

add_notes(s, "Bienvenidos. Mi nombre es [nombre], de Red Lion Tech Solutions. Hoy les muestro una solucion de menus "
             "digitales para tiendas de abarrotes y restaurantes pequeos en Georgia. El objetivo es mejorar la poblacion, "
             "las ventas y la experiencia del cliente, todo en espanol y adaptado a su negocio.")

# ===== SLIDE 2 — El problema =====
s = prs.slides.add_slide(blank)
header_bar(s, "El problema actual", "Los menus fisicos atrapan al negocio")
footer(s, 2)

problems = [
    ("1", "Menú desactualizado"),
    ("2", "Impresion y reemplazo constantes"),
    ("3", "Error de precio / producto"),
    ("4", "Tiempo perdido del personal"),
    ("5", "Pérdida de ventas"),
]
y0 = Inches(1.6)
for i, (num, title) in enumerate(problems):
    y = y0 + Inches(i * 1.05)
    add_rect(s, Inches(0.6), y, Inches(0.7), Inches(0.8), RED)
    add_text(s, Inches(0.6), y + Inches(0.15), Inches(0.7), Inches(0.5),
             num, size=26, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_rect(s, Inches(1.35), y, Inches(11.3), Inches(0.8), RGBColor(0xEE, 0xEE, 0xEE))
    add_text(s, Inches(1.6), y + Inches(0.18), Inches(11), Inches(0.5),
             title, size=20, color=DARK, bold=True)

add_text(s, Inches(0.6), Inches(6.3), Inches(12), Inches(0.8),
         "El menu es la carta de ventas de su tienda. Si no esta actualizado, se pierden ventas.",
         size=18, color=GRAY, align=PP_ALIGN.CENTER)

add_notes(s, "Pregunto: con que frecuencia actualizan su menu? Quin crea el menu? Cual es el costo de imprimir y reemplazar? "
             "El problema es que el menu fisico se pierde, se desdeda, y tarda dias en actualizar. Esto genera perdida de ventas "
             "y tiempo del personal.")

# ===== SLIDE 3 — La solución =====
s = prs.slides.add_slide(blank)
header_bar(s, "La solucion", "Menus digitales con su marca")
footer(s, 3)

add_rect(s, Inches(0.6), Inches(1.6), Inches(12.1), Inches(5.2), WHITE)
add_text(s, Inches(0.9), Inches(1.85), Inches(11.5), Inches(0.5),
         "Su menu en pantalla digital, controlado por usted", size=22, color=DARK, bold=True)

bullets = [
    "Pantallas digitales en su mostrador (1 a mas)",
    "Personalizacion con su nombre, logo, colores y temas",
    "Actualizacion en minutos, sin imprimir ni pegar",
    "Menus por categoria: comida, bebidas, combos",
    "Codigo QR para que el cliente vea el menu en el celular",
    "Temas segun el negocio: QSR, cafetera, mercado, bar",
    "Moneda adaptada al cliente (USD, S/, RD$, Euro, Colon...)",
]
y = Inches(2.6)
for b in bullets:
    add_rect(s, Inches(0.9), y + Inches(0.12), Inches(0.18), Inches(0.18), RED)
    add_text(s, Inches(1.25), y, Inches(11), Inches(0.5), b, size=16, color=DARK)
    y += Inches(0.58)

add_notes(s, "Le muestro la solucion: una pantalla digital en su mostrador, con su logo, colores y temas. "
             "Usted puede actualizar los precios en minutos. Agregamos un codigo QR para que el cliente vea el menu en el "
             "celular, ideal para pedidos y promociones. Adaptamos la moneda al cliente (USD, S/, RD$, etc.).")

# ===== SLIDE 4 — Cómo funciona =====
s = prs.slides.add_slide(blank)
header_bar(s, "Como funciona", "3 simples pasos")
footer(s, 4)

steps = [
    ("1", "Presentar", "Una pantalla, un diseño, su nombre y precios."),
    ("2", "Configurar", "Menu, fotos, combos, codigo QR y temas."),
    ("3", "Vender", "Pantalla en vivo, actualizacion remota, codigo QR."),
]
x = Inches(0.8)
for i, (num, title, desc) in enumerate(steps):
    w = Inches(3.6)
    add_rect(s, x, Inches(1.8), w, Inches(4.5), WHITE)
    add_rect(s, x, Inches(1.8), w, Inches(0.9), RED if i == 0 else ORANGE)
    add_text(s, x, Inches(1.85), w, Inches(0.5), num, size=32, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.2), Inches(2.4), w - Inches(0.4), Inches(0.6), title, size=20, color=DARK, bold=True, align=PP_ALIGN.CENTER)
    add_text(s, x + Inches(0.3), Inches(3.1), w - Inches(0.6), Inches(2.8), desc, size=15, color=GRAY, align=PP_ALIGN.CENTER, line_spacing=1.2)
    x += Inches(4.15)

add_text(s, Inches(0.8), Inches(6.6), Inches(11), Inches(0.5),
         "La instalacion y la configuracion son rapidas. Usted empieza a vender en la misma semana.",
         size=16, color=GRAY, align=PP_ALIGN.CENTER)

add_notes(s, "Explico el flujo: uno, presentar (instalamos la pantalla con su marca). Dos, configurar (su menu, fotos, combos, QR). "
             "Tres, vender (pantalla en vivo, actualizacion remota, cliente usa QR). "
             "Resalto que la instalacion es rapida y empieza a vender en la misma semana.")

# ===== SLIDE 5 — Para quién es =====
s = prs.slides.add_slide(blank)
header_bar(s, "Para quien es", "Tiendas y restaurantes con presencia hispana")
footer(s, 5)

add_text(s, Inches(0.6), Inches(1.5), Inches(12), Inches(0.5),
         "El producto se ajusta a distintos tipos de negocios del barrio", size=18, color=GRAY)

categories = [
    ("Tiendas de abarrotes", "Mercado, conveniencia, distribucion local"),
    ("Cafeterias y panaderia", "Productos frescos, pasteles, cafe"),
    ("Pizzerias y trattorias", "Comida a la carta, mezclilleras, promociones"),
    ("Restaurantes coreanos / niches", "Menus especializados, platos locales"),
    ("Bares y cantinas", "Bebidas, comida rapida, combos"),
    ("Comida rapida / QSR", "Menus rapidos, precio especial, combos"),
]
y = Inches(2.1)
for cat, desc in categories:
    add_rect(s, Inches(0.6), y, Inches(0.12), Inches(0.65), RED)
    add_text(s, Inches(0.95), y, Inches(4.5), Inches(0.35), cat, size=17, color=DARK, bold=True)
    add_text(s, Inches(0.95), y + Inches(0.35), Inches(4.5), Inches(0.3), desc, size=13, color=GRAY)
    y += Inches(0.72)

add_text(s, Inches(6.5), Inches(2.1), Inches(6.2), Inches(4.5),
         "Su tipo de negocio no figura?\nNo se preocupe. Lo adaptamos a su negocio.",
         size=18, color=DARK, bold=True, align=PP_ALIGN.CENTER, line_spacing=1.2)

add_notes(s, "Muestro los tipos de negocios que atendo: tiendas de abarrotes, cafeterias, pizzerias, restaurantes surcoreanos, "
             "bares, comida rapida. Si su negocio no esta listado, la clave es que lo adaptamos. "
             "Le pregunto: que tipo de negocio tiene y como le gusta mostrar sus productos?")

# ===== SLIDE 6 — Paquetes =====
s = prs.slides.add_slide(blank)
header_bar(s, "Paquetes", "Segun el tamanio de su tienda")
footer(s, 6)

headers = ["Nivel", "Pantallas", "Incluye", "Precio / mes"]
rows = [
    ["Basico", "1 pantalla", "Personalizacion, actualizacion remota, soporte basico", "$X"],
    ["Pro", "2 pantallas", "Dos pantallas, upsell, diseño de combos, instalacion", "$X"],
    ["Enterprise", "3+ pantallas", "Gestion central, reporte, soporte/manutencion", "$X+"],
]
col_w = [Inches(1.6), Inches(1.8), Inches(6.6), Inches(1.9)]
table_top = Inches(1.6)
row_h = Inches(0.95)

add_rect(s, Inches(0.6), table_top, sum(col_w), Inches(0.6), RED)
x = Inches(0.6)
for i, h in enumerate(headers):
    add_text(s, x + Inches(0.1), table_top + Inches(0.1), col_w[i] - Inches(0.2), Inches(0.4),
             h, size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    x += col_w[i]

for r, row in enumerate(rows):
    bg = RGBColor(0xFA, 0xFA, 0xFA) if r % 2 == 0 else WHITE
    add_rect(s, Inches(0.6), table_top + Inches(0.6) + Inches(r * row_h), sum(col_w), row_h, bg)
    x = Inches(0.6)
    for i, val in enumerate(row):
        add_text(s, x + Inches(0.1), table_top + Inches(0.6) + Inches(r * row_h) + Inches(0.15),
                 col_w[i] - Inches(0.2), Inches(0.65), val, size=14, color=DARK, bold=(i == 0),
                 align=PP_ALIGN.CENTER if i == 0 else PP_ALIGN.LEFT)
        x += col_w[i]

add_text(s, Inches(0.6), Inches(5.4), Inches(12), Inches(0.5),
         "Nota: los precios son orientativos. Para su tienda, sugerimos un paquete segun el numero de pantallas.",
         size=13, color=GRAY)

add_notes(s, "Tres niveles. Basico: una pantalla. Pro: dos pantallas con upsell y diseño de combos — mi recomendacion para "
             "la mayoria de tiendas pequenas. Enterprise: tres o mas pantallas con soporte y reporte. "
             "Pregunto: cuantas pantallas le alcanzan en su mostrador? El precio final se ajusta segun el compromiso.")

# ===== SLIDE 7 — Beneficios / ROI =====
s = prs.slides.add_slide(blank)
header_bar(s, "El valor del dinero", "Por que vale la pena?")
footer(s, 7)

benefits = [
    ("1", "Mayor visibilidad de promociones", "Más ventas al resaltar las ofertas"),
    ("2", "Actualizacion inmediata", "Sin imprimir ni esperar, el menu se actualiza al instante"),
    ("3", "Menos tiempo del personal", "El personal deja de manejar etiquetas e imprime menos"),
    ("4", "Menu actualizado", "La informacion de precios y productos siempre es correcta"),
    ("5", "Codigo QR", "El cliente ve el menu en su celular, con mas interaccion y pedidos"),
    ("6", "Bajo costo operativo", "Menos gastos de impresion y reposicion vs. un menu fisico"),
]
box_w = Inches(3.8)
box_h = Inches(2.1)
x0 = Inches(0.7)
y0 = Inches(1.5)
gap_x = Inches(0.3)
gap_y = Inches(0.2)
for i, (num, title, desc) in enumerate(benefits):
    col = i % 3
    row = i // 3
    x = x0 + col * (box_w + gap_x)
    y = y0 + row * (box_h + gap_y)
    add_rect(s, x, y, box_w, box_h, RGBColor(0xEE, 0xEE, 0xEE))
    add_rect(s, x, y, box_w, Inches(0.1), RED if col == 0 else ORANGE)
    add_text(s, x + Inches(0.2), y + Inches(0.25), Inches(1.2), Inches(0.6), num, size=28, color=RED, bold=True)
    add_text(s, x + Inches(0.2), y + Inches(0.95), box_w - Inches(0.4), Inches(0.6), title, size=15, color=DARK, bold=True)
    add_text(s, x + Inches(0.2), y + Inches(1.55), box_w - Inches(0.4), Inches(0.5), desc, size=12, color=GRAY)

add_text(s, Inches(0.7), Inches(6.35), Inches(12), Inches(0.7),
         "Prueba de 30 dias sin compromiso.\n"
         "Si no le convence, cancela sin problema.\n"
         "En 30 dias puede ver el resultado.",
         size=16, color=GRAY, align=PP_ALIGN.CENTER, line_spacing=1.4, space_after=6)

add_notes(s, "Los beneficios: mayor visibilidad, actualizacion inmediata, menos tiempo del personal, menu actualizado, QR y "
             "bajo costo. Lo clave es la prueba de 30 dias sin compromiso. Si no gusta, se cancela. "
             "Refuerzo: si en 30 dias vea que las ventas mejoran, el sistema se paga solo.")

# ===== SLIDE 8 — Por que nosotros =====
s = prs.slides.add_slide(blank)
header_bar(s, "Por que Red Lion Tech Solutions?", "Usted trabaja con un equipo cercano")
footer(s, 8)

whys = [
    ("5", "Equipo local en Georgia, 2 personas y apoyo en espanol"),
    ("2", "Implementacion directa: configuracion, instalacion y soporte"),
    ("7", "Ajustado al mercado de Georgia (USD y otras monedas)"),
    ("8", "Especializados en restaurantes y tiendas de abarrotes"),
    ("3", "Apoyo cercano a su comunidad latina"),
    ("6", "Despliegue escalable: 3 pantallas a 100"),
]
y = Inches(1.7)
for i, (num, txt) in enumerate(whys):
    add_rect(s, Inches(0.6), y, Inches(12.1), Inches(0.8), WHITE)
    add_rect(s, Inches(0.6), y, Inches(0.15), Inches(0.8), RED if y == Inches(1.7) else ORANGE)
    add_text(s, Inches(0.95), y + Inches(0.1), Inches(1), Inches(0.6), num, size=26, color=DARK, bold=True)
    add_text(s, Inches(1.3), y + Inches(0.1), Inches(11), Inches(0.6), txt, size=16, color=DARK)
    y += Inches(0.9)

add_notes(s, "Nuestro equipo es pequeno, esta en Georgia, habla espanol y conoce el barrio. "
             "Implementamos directamente: configuracion, instalacion y soporte. "
             "Adaptamos a la moneda de su cliente. Y el modelo es escalable a mas tiendas. "
             "Pregunto: ya tiene alguna solucion de menu digital, o es la primera vez?")

# ===== SLIDE 9 — Llamado a la acción =====
s = prs.slides.add_slide(blank)
header_bar(s, "Prueba y decide", "Empiece con 3 tiendas de prueba")
footer(s, 9)

add_rect(s, Inches(0.6), Inches(1.7), Inches(12.1), Inches(4.6), WHITE)
add_rect(s, Inches(0.6), Inches(1.7), Inches(0.3), Inches(4.6), RED)

items = [
    ("1", "Prueba de 30 dias sin compromiso"),
    ("2", "Instalacion rapida y configuracion adaptada"),
    ("3", "Contenido diseñado para su negocio (espanol + marca)"),
    ("4", "Soporte en espanol y presencial si es necesario"),
    ("5", "Plan escalable: empieza 1 pantalla, crece con su tienda"),
]
y = Inches(2.1)
for i, (num, txt) in enumerate(items):
    add_text(s, Inches(1.1), y, Inches(0.6), Inches(0.5), num, size=28, color=RED, bold=True)
    add_text(s, Inches(1.8), y, Inches(10.5), Inches(0.6), txt, size=18, color=DARK)
    y += Inches(0.75)

add_rect(s, Inches(1.1), Inches(5.2), Inches(5), Inches(0.05), ORANGE)
add_text(s, Inches(1.1), Inches(5.35), Inches(11), Inches(0.5),
         "Proximo paso: confirmar fecha de prueba y recibir propuesta detallada.",
         size=16, color=RED, bold=True)

add_notes(s, "Cierro con la oferta: prueba de 30 dias sin compromiso. "
             "Empezamos con 3 tiendas de prueba para validar el modelo. "
             "Pido: cual es su disponibilidad para una cita esta semana? "
             "Luego envio la propuesta y confirmo una reunion final.")

# ===== SLIDE 10 — Contacto =====
s = prs.slides.add_slide(blank)
add_rect(s, 0, 0, prs.slide_width, prs.slide_height, DARK)
add_rect(s, 0, 0, prs.slide_width, Inches(0.25), RED)
add_rect(s, 0, prs.slide_height - Inches(0.25), prs.slide_width, Inches(0.25), RED)

add_text(s, Inches(0.8), Inches(0.8), Inches(11), Inches(0.6),
         "RED LION TECH SOLUTIONS", size=20, color=ORANGE, bold=True)
add_rect(s, Inches(0.85), Inches(1.55), Inches(2.2), Inches(0.05), ORANGE)

add_text(s, Inches(0.8), Inches(2.6), Inches(11.5), Inches(1.2),
         "Gracias por su tiempo", size=48, color=WHITE, bold=True)

contacts = [
    "Red Lion Tech Solutions",
    "Menus Digitales",
    "",
    "Georgia, EE.UU.",
    "[telefono principal]",
    "WhatsApp / [celular]",
    "[correo electrónico]",
    "menu.redlionai.com",
    "",
    "Proyecto UNO  |  Presentacion hispana",
]
add_text(s, Inches(0.85), Inches(3.9), Inches(11), Inches(3),
         "\n".join(contacts), size=18, color=RGBColor(0xCC, 0xCC, 0xCC), line_spacing=1.4)

add_notes(s, "Cierro que pueden contactarme por telefono, WhatsApp o correo, y el sitio web. "
             "Llevo un folleto impreso y el enlace de demo. Pido una cita y el siguiente paso.")

prs.save(out_path)
print("GUARDADO:", out_path)
print("Diapositivas:", len(prs.slides))
print("Tamaño:", os.path.getsize(out_path), "bytes")
