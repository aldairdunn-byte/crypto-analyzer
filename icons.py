"""
Biblioteca de Iconos Vectoriales SVG y Componentes Gráficos para Crypto Analyzer.
100% Vectorial, optimizado para Dark Mode y Cero Emojis.
"""

def svg_icon(name: str, size: int = 20, color: str = "currentColor", extra_class: str = "") -> str:
    """Retorna el código SVG correspondiente al icono solicitado."""
    icons = {
        # --- LOGOS DE CRIPTOMONEDAS ---
        "btc": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#F7931A"/>
            <path fill="#FFF" d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.922-.221-1.387-.325l.696-2.788-1.727-.43-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.827 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.383-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.14 .986-5.31.695l.947-3.799c1.17.292 4.925.872 4.363 3.104zm.536-5.578c-.487 1.953-3.495.96-4.47.717l.86-3.45c.974.243 4.118.697 3.61 2.733z"/>
        </svg>''',

        "eth": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#627EEA"/>
            <g fill="#FFF" fill-rule="evenodd">
                <path fill-opacity=".6" d="M16.498 4v8.87l7.497 3.35z"/>
                <path d="M16.498 4L9 16.22l7.498-3.35z"/>
                <path fill-opacity=".6" d="M16.498 21.968v6.027L24 17.616z"/>
                <path d="M16.498 27.995v-6.028L9 17.616z"/>
                <path fill-opacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z"/>
                <path fill-opacity=".6" d="M9 16.22l7.498 4.353v-7.701z"/>
            </g>
        </svg>''',

        "sol": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#141414"/>
            <defs>
                <linearGradient id="sol-g1" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#00FFA3"/>
                    <stop offset="100%" stop-color="#DC1FFF"/>
                </linearGradient>
            </defs>
            <path fill="url(#sol-g1)" d="M8.5 21.8c.2-.2.5-.3.8-.3h12.4c.5 0 .9.4 1.1.8.2.4.1.9-.2 1.2l-1.9 1.9c-.2.2-.5.3-.8.3H7.5c-.5 0-.9-.4-1.1-.8-.2-.4-.1-.9.2-1.2l1.9-1.9zm0-11.6c.2-.2.5-.3.8-.3h12.4c.5 0 .9.4 1.1.8.2.4.1.9-.2 1.2l-1.9 1.9c-.2.2-.5.3-.8.3H7.5c-.5 0-.9-.4-1.1-.8-.2-.4-.1-.9.2-1.2l1.9-1.9zm15 5.8c-.2-.2-.5-.3-.8-.3H10.3c-.5 0-.9.4-1.1.8-.2.4-.1.9.2 1.2l1.9 1.9c.2.2.5.3.8.3h12.4c.5 0 .9-.4 1.1-.8.2-.4.1-.9-.2-1.2l-1.9-1.9z"/>
        </svg>''',

        "bnb": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#F0B90B"/>
            <path fill="#FFF" d="M16 6.5l3.2 3.2-5.7 5.7 2.5 2.5 5.7-5.7 3.2 3.2L16 24.3l-8.9-8.9L16 6.5zm-5.7 8.9L8.1 13.2l2.2-2.2 2.2 2.2-2.2 2.2zm11.4 0l-2.2-2.2 2.2-2.2 2.2 2.2-2.2 2.2zm-5.7 2.2l2.2-2.2 2.2 2.2-2.2 2.2-2.2-2.2z"/>
        </svg>''',

        "ada": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#0033AD"/>
            <circle cx="16" cy="16" r="6" fill="#FFF"/>
        </svg>''',

        "link": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#375BD2"/>
            <path fill="#FFF" d="M16 8l7 4v8l-7 4-7-4v-8l7-4zm4.5 10.5v-5l-4.5-2.6-4.5 2.6v5l4.5 2.6 4.5-2.6z"/>
        </svg>''',

        "shib": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#FFA409"/>
            <path fill="#FFF" d="M21.5 10.2l-2.7 1.8c-.8-.4-1.8-.7-2.8-.7s-2 .3-2.8.7l-2.7-1.8-1 4.5c-.7 1.2-1 2.5-1 3.9 0 4.1 3.4 7.4 7.5 7.4s7.5-3.3 7.5-7.4c0-1.4-.4-2.7-1-3.9l-1-4.5zm-5.5 12.6c-2.4 0-4.4-1.5-4.9-3.6h9.8c-.5 2.1-2.5 3.6-4.9 3.6z"/>
        </svg>''',

        "usdt": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#26A17B"/>
            <path fill="#FFF" d="M17.9 14.8v-2.2h5.5V9.4H8.6v3.2h5.5v2.2c-4.9.2-8.6 1.2-8.6 2.4s3.7 2.2 8.6 2.4v6.8h3.8v-6.8c4.9-.2 8.6-1.2 8.6-2.4s-3.7-2.2-8.6-2.4zm0 3.6c-3.7-.2-6.5-.8-6.5-1.5s2.8-1.3 6.5-1.5v3zm3.8-1.5c0 .7-2.8 1.3-6.5 1.5v-3c3.7.2 6.5.8 6.5 1.5z"/>
        </svg>''',

        "gala": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#131722"/>
            <circle cx="16" cy="16" r="14" fill="none" stroke="#00FFA3" stroke-width="2"/>
            <path fill="#00FFA3" d="M16 8l7 12H9l7-12z"/>
        </svg>''',

        "usdc": f'''<svg width="{size}" height="{size}" viewBox="0 0 32 32" class="{extra_class}" style="vertical-align: middle;">
            <circle cx="16" cy="16" r="16" fill="#2775CA"/>
            <path fill="#FFF" d="M16 7.5c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5 8.5-3.8 8.5-8.5-3.8-8.5-8.5-8.5zm0 15c-3.6 0-6.5-2.9-6.5-6.5S12.4 9.5 16 9.5s6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5zm.9-10.4h-2.1v1.1c-.8.1-1.6.4-2.1.9l.8 1.2c.4-.3.9-.6 1.5-.7v1.8c-.9.3-2.1.8-2.1 2.2 0 1.2.9 2 2.1 2.2v1.2h2.1v-1.1c.9-.1 1.7-.5 2.3-1.1l-.8-1.2c-.5.4-1.1.7-1.7.8v-1.9c1-.3 2.1-.8 2.1-2.2 0-1.2-.9-2-2.1-2.2v-1.2zm-2.1 3.5c-.4 0-.7-.2-.7-.6s.3-.6.7-.8v1.4zm2.1 2.9c.4 0 .7.2.7.6s-.3.6-.7.8v-1.4z"/>
        </svg>''',

        # --- ICONOS DE UI & TRADING ---
        "trending-up": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>''',

        "trending-down": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
        </svg>''',

        "shield": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>''',

        "target": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
        </svg>''',

        "crosshair": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
        </svg>''',

        "wallet": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
            <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"></path>
            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
        </svg>''',

        "bell": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>''',

        "zap": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>''',

        "activity": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>''',

        "award": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>''',

        "clock": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>''',

        "check": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>''',

        "alert-triangle": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>''',

        "info": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>''',

        "user": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>''',

        "settings": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>''',

        "filter": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>''',

        "trash": f'''<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{extra_class}">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>'''
    }
    return icons.get(name.lower(), "")

def render_sparkline_svg(trend: str = "up", width: int = 70, height: int = 24) -> str:
    """Genera una micro-onda SVG de tendencia alcista o bajista."""
    if trend == "up":
        points = "0,18 12,16 24,19 36,12 48,14 60,6 70,3"
        stroke = "#0ECB81"
    elif trend == "gold":
        points = "0,20 14,17 28,19 42,11 56,13 70,4"
        stroke = "#F0B90B"
    else:
        points = "0,4 12,8 24,6 36,14 48,12 60,19 70,22"
        stroke = "#F6465D"
    return f'''<svg width="{width}" height="{height}" viewBox="0 0 70 24" style="vertical-align:middle;">
        <polyline points="{points}" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>'''

def render_momentum_bar_svg(score: float, width: int = 60, height: int = 8) -> str:
    """Genera una mini-barra de progreso horizontal para el score de momentum."""
    fill_w = int((score / 100.0) * width)
    color = "#0ECB81" if score >= 60 else ("#F0B90B" if score >= 45 else "#F6465D")
    return f'''<svg width="{width}" height="{height}" style="vertical-align:middle; background:#1E232F; border-radius:4px;">
        <rect width="{fill_w}" height="{height}" fill="{color}" rx="4"/>
    </svg>'''

def render_speedometer_svg(value: int = 61) -> str:
    """Genera el velocímetro / arco SVG para Sentimiento del Mercado."""
    # Semicírculo con aguja
    return f'''<svg width="140" height="75" viewBox="0 0 140 75">
        <path d="M 15 70 A 55 55 0 0 1 125 70" fill="none" stroke="#1E232F" stroke-width="12" stroke-linecap="round"/>
        <path d="M 15 70 A 55 55 0 0 1 50 25" fill="none" stroke="#F6465D" stroke-width="12" stroke-linecap="round"/>
        <path d="M 50 25 A 55 55 0 0 1 90 25" fill="none" stroke="#F0B90B" stroke-width="12"/>
        <path d="M 90 25 A 55 55 0 0 1 125 70" fill="none" stroke="#0ECB81" stroke-width="12" stroke-linecap="round"/>
        <!-- Aguja -->
        <circle cx="70" cy="68" r="5" fill="#FFF"/>
        <line x1="70" y1="68" x2="96" y2="34" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>
        <text x="70" y="58" text-anchor="middle" fill="#FFF" font-size="16" font-weight="800" font-family="Inter, sans-serif">{value}</text>
    </svg>'''

def render_circle_gauge_svg(value: int = 67) -> str:
    """Genera el indicador circular SVG para Miedo y Codicia."""
    # Circunferencia completa con arco verde/amarillo
    return f'''<svg width="110" height="75" viewBox="0 0 110 75">
        <path d="M 15 65 A 40 40 0 1 1 95 65" fill="none" stroke="#1E232F" stroke-width="9" stroke-linecap="round"/>
        <path d="M 15 65 A 40 40 0 0 1 88 24" fill="none" stroke="#F0B90B" stroke-width="9" stroke-linecap="round"/>
        <path d="M 88 24 A 40 40 0 0 1 95 65" fill="none" stroke="#0ECB81" stroke-width="9" stroke-linecap="round"/>
        <text x="55" y="48" text-anchor="middle" fill="#FFF" font-size="18" font-weight="900" font-family="Inter, sans-serif">{value}</text>
    </svg>'''
