export interface CoinInfo {
  id: string;
  name: string;
  symbol: string;
  binanceSymbol: string;
  category: 'TOP' | 'AI' | 'DEFI' | 'MEME' | 'L2';
  basePrice: number;
  decimals: number;
  description?: string;
  tags?: string[];
  arbitrageRating?: 'ALTO' | 'MEDIO' | 'MODERADO';
}

export const COINS: Record<string, CoinInfo> = {
  // ─── 1. TOP LAYER-1 & MAJORS (23) ───
  bitcoin: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', binanceSymbol: 'BTCUSDT', category: 'TOP', basePrice: 68450.00, decimals: 2 },
  ethereum: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', binanceSymbol: 'ETHUSDT', category: 'TOP', basePrice: 2615.00, decimals: 2 },
  solana: { id: 'solana', name: 'Solana', symbol: 'SOL', binanceSymbol: 'SOLUSDT', category: 'TOP', basePrice: 145.20, decimals: 2 },
  binancecoin: { id: 'binancecoin', name: 'BNB Chain', symbol: 'BNB', binanceSymbol: 'BNBUSDT', category: 'TOP', basePrice: 578.40, decimals: 2 },
  ripple: { id: 'ripple', name: 'Ripple', symbol: 'XRP', binanceSymbol: 'XRPUSDT', category: 'TOP', basePrice: 0.5420, decimals: 4 },
  cardano: { id: 'cardano', name: 'Cardano', symbol: 'ADA', binanceSymbol: 'ADAUSDT', category: 'TOP', basePrice: 0.3540, decimals: 4 },
  avalanche: { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', binanceSymbol: 'AVAXUSDT', category: 'TOP', basePrice: 27.80, decimals: 2 },
  sui: { id: 'sui', name: 'Sui Network', symbol: 'SUI', binanceSymbol: 'SUIUSDT', category: 'TOP', basePrice: 1.82, decimals: 2 },
  polkadot: { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', binanceSymbol: 'DOTUSDT', category: 'TOP', basePrice: 4.25, decimals: 2 },
  chainlink: { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', binanceSymbol: 'LINKUSDT', category: 'TOP', basePrice: 11.45, decimals: 2 },
  polygon: { id: 'polygon', name: 'Polygon', symbol: 'POL', binanceSymbol: 'POLUSDT', category: 'TOP', basePrice: 0.3850, decimals: 4 },
  toncoin: { id: 'toncoin', name: 'The Open Network', symbol: 'TON', binanceSymbol: 'TONUSDT', category: 'TOP', basePrice: 5.20, decimals: 2 },
  tron: { id: 'tron', name: 'TRON', symbol: 'TRX', binanceSymbol: 'TRXUSDT', category: 'TOP', basePrice: 0.1580, decimals: 4 },
  aptos: { id: 'aptos', name: 'Aptos', symbol: 'APT', binanceSymbol: 'APTUSDT', category: 'TOP', basePrice: 8.90, decimals: 2 },
  celestia: { id: 'celestia', name: 'Celestia', symbol: 'TIA', binanceSymbol: 'TIAUSDT', category: 'TOP', basePrice: 5.10, decimals: 2 },
  cosmos: { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', binanceSymbol: 'ATOMUSDT', category: 'TOP', basePrice: 4.80, decimals: 2 },
  sei: { id: 'sei', name: 'Sei Network', symbol: 'SEI', binanceSymbol: 'SEIUSDT', category: 'TOP', basePrice: 0.4200, decimals: 4 },
  kaspa: { id: 'kaspa', name: 'Kaspa', symbol: 'KAS', binanceSymbol: 'KASUSDT', category: 'TOP', basePrice: 0.1250, decimals: 4 },
  hedera: { id: 'hedera', name: 'Hedera', symbol: 'HBAR', binanceSymbol: 'HBARUSDT', category: 'TOP', basePrice: 0.0520, decimals: 4 },
  algorand: { id: 'algorand', name: 'Algorand', symbol: 'ALGO', binanceSymbol: 'ALGOUSDT', category: 'TOP', basePrice: 0.1320, decimals: 4 },
  'internet-computer': { id: 'internet-computer', name: 'Internet Computer', symbol: 'ICP', binanceSymbol: 'ICPUSDT', category: 'TOP', basePrice: 8.50, decimals: 2 },
  vechain: { id: 'vechain', name: 'VeChain', symbol: 'VET', binanceSymbol: 'VETUSDT', category: 'TOP', basePrice: 0.0240, decimals: 4 },
  filecoin: { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', binanceSymbol: 'FILUSDT', category: 'TOP', basePrice: 3.80, decimals: 2 },

  // ─── 2. BITCOIN ECOSYSTEM & BREAKOUTS (4) ───
  stacks: { id: 'stacks', name: 'Stacks (Bitcoin L2)', symbol: 'STX', binanceSymbol: 'STXUSDT', category: 'TOP', basePrice: 1.85, decimals: 2 },
  ordinals: { id: 'ordinals', name: 'Ordinals', symbol: 'ORDI', binanceSymbol: 'ORDIUSDT', category: 'TOP', basePrice: 38.50, decimals: 2 },
  sats: { id: 'sats', name: '1000SATS (Ordinals)', symbol: '1000SATS', binanceSymbol: '1000SATSUSDT', category: 'MEME', basePrice: 0.000285, decimals: 6 },
  'pax-gold': { id: 'pax-gold', name: 'PAX Gold', symbol: 'PAXG', binanceSymbol: 'PAXGUSDT', category: 'TOP', basePrice: 2650.00, decimals: 2 },

  // ─── 3. LAYER-2 & MODULAR SCALING (7) ───
  arbitrum: { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', binanceSymbol: 'ARBUSDT', category: 'L2', basePrice: 0.5400, decimals: 4 },
  optimism: { id: 'optimism', name: 'Optimism', symbol: 'OP', binanceSymbol: 'OPUSDT', category: 'L2', basePrice: 1.65, decimals: 2 },
  layerzero: { id: 'layerzero', name: 'LayerZero', symbol: 'ZRO', binanceSymbol: 'ZROUSDT', category: 'L2', basePrice: 3.95, decimals: 2 },
  starknet: { id: 'starknet', name: 'Starknet', symbol: 'STRK', binanceSymbol: 'STRKUSDT', category: 'L2', basePrice: 0.4200, decimals: 4 },
  manta: { id: 'manta', name: 'Manta Network', symbol: 'MANTA', binanceSymbol: 'MANTAUSDT', category: 'L2', basePrice: 0.7800, decimals: 4 },
  movement: { id: 'movement', name: 'Movement', symbol: 'MOVE', binanceSymbol: 'MOVEUSDT', category: 'L2', basePrice: 0.8500, decimals: 4 },
  saga: { id: 'saga', name: 'Saga Protocol', symbol: 'SAGA', binanceSymbol: 'SAGAUSDT', category: 'L2', basePrice: 2.10, decimals: 2 },

  // ─── 4. AI & BIG DATA (12) ───
  'fetch-ai': { id: 'fetch-ai', name: 'Fetch.ai (ASI)', symbol: 'FET', binanceSymbol: 'FETUSDT', category: 'AI', basePrice: 1.34, decimals: 4 },
  render: { id: 'render', name: 'Render Network', symbol: 'RENDER', binanceSymbol: 'RENDERUSDT', category: 'AI', basePrice: 5.68, decimals: 2 },
  near: { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', binanceSymbol: 'NEARUSDT', category: 'AI', basePrice: 4.85, decimals: 2 },
  bittensor: { id: 'bittensor', name: 'Bittensor', symbol: 'TAO', binanceSymbol: 'TAOUSDT', category: 'AI', basePrice: 512.00, decimals: 2 },
  injective: { id: 'injective', name: 'Injective Protocol', symbol: 'INJ', binanceSymbol: 'INJUSDT', category: 'AI', basePrice: 21.40, decimals: 2 },
  worldcoin: { id: 'worldcoin', name: 'Worldcoin', symbol: 'WLD', binanceSymbol: 'WLDUSDT', category: 'AI', basePrice: 1.95, decimals: 2 },
  'the-graph': { id: 'the-graph', name: 'The Graph', symbol: 'GRT', binanceSymbol: 'GRTUSDT', category: 'AI', basePrice: 0.1650, decimals: 4 },
  akash: { id: 'akash', name: 'Akash Network', symbol: 'AKT', binanceSymbol: 'AKTUSDT', category: 'AI', basePrice: 0.5520, decimals: 4 },
  'io-net': { id: 'io-net', name: 'io.net Compute', symbol: 'IO', binanceSymbol: 'IOUSDT', category: 'AI', basePrice: 2.20, decimals: 2 },
  virtual: { id: 'virtual', name: 'Virtual Protocol', symbol: 'VIRTUAL', binanceSymbol: 'VIRTUALUSDT', category: 'AI', basePrice: 1.45, decimals: 2 },
  aixbt: { id: 'aixbt', name: 'AIXBT Agent', symbol: 'AIXBT', binanceSymbol: 'AIXBTUSDT', category: 'AI', basePrice: 0.3800, decimals: 4 },
  arweave: { id: 'arweave', name: 'Arweave', symbol: 'AR', binanceSymbol: 'ARUSDT', category: 'AI', basePrice: 18.20, decimals: 2 },

  // ─── 5. DEFI, YIELD & RWA (12) ───
  uniswap: { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', binanceSymbol: 'UNIUSDT', category: 'DEFI', basePrice: 7.45, decimals: 2 },
  aave: { id: 'aave', name: 'Aave', symbol: 'AAVE', binanceSymbol: 'AAVEUSDT', category: 'DEFI', basePrice: 148.50, decimals: 2 },
  jupiter: { id: 'jupiter', name: 'Jupiter Exchange', symbol: 'JUP', binanceSymbol: 'JUPUSDT', category: 'DEFI', basePrice: 0.8800, decimals: 4 },
  ethena: { id: 'ethena', name: 'Ethena USDe', symbol: 'ENA', binanceSymbol: 'ENAUSDT', category: 'DEFI', basePrice: 0.5800, decimals: 4 },
  ondo: { id: 'ondo', name: 'Ondo Finance RWA', symbol: 'ONDO', binanceSymbol: 'ONDOUSDT', category: 'DEFI', basePrice: 0.7200, decimals: 4 },
  pendle: { id: 'pendle', name: 'Pendle Yield', symbol: 'PENDLE', binanceSymbol: 'PENDLEUSDT', category: 'DEFI', basePrice: 4.10, decimals: 2 },
  maker: { id: 'maker', name: 'Maker', symbol: 'MKR', binanceSymbol: 'MKRUSDT', category: 'DEFI', basePrice: 1650.00, decimals: 2 },
  raydium: { id: 'raydium', name: 'Raydium', symbol: 'RAY', binanceSymbol: 'RAYUSDT', category: 'DEFI', basePrice: 4.80, decimals: 2 },
  fantom: { id: 'fantom', name: 'Sonic (Fantom)', symbol: 'FTM', binanceSymbol: 'FTMUSDT', category: 'DEFI', basePrice: 0.6800, decimals: 4 },
  pyth: { id: 'pyth', name: 'Pyth Network', symbol: 'PYTH', binanceSymbol: 'PYTHUSDT', category: 'DEFI', basePrice: 0.3950, decimals: 4 },
  dydx: { id: 'dydx', name: 'dYdX Protocol', symbol: 'DYDX', binanceSymbol: 'DYDXUSDT', category: 'DEFI', basePrice: 1.15, decimals: 2 },
  lido: { id: 'lido', name: 'Lido DAO', symbol: 'LDO', binanceSymbol: 'LDOUSDT', category: 'DEFI', basePrice: 1.25, decimals: 2 },

  // ─── 6. MEMES & HIGH VOLATILITY (11) ───
  dogecoin: { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', binanceSymbol: 'DOGEUSDT', category: 'MEME', basePrice: 0.1420, decimals: 4 },
  'shiba-inu': { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', binanceSymbol: 'SHIBUSDT', category: 'MEME', basePrice: 0.00001735, decimals: 8 },
  pepe: { id: 'pepe', name: 'Pepe', symbol: 'PEPE', binanceSymbol: 'PEPEUSDT', category: 'MEME', basePrice: 0.00000985, decimals: 8 },
  dogwifhat: { id: 'dogwifhat', name: 'dogwifhat', symbol: 'WIF', binanceSymbol: 'WIFUSDT', category: 'MEME', basePrice: 2.45, decimals: 2 },
  bonk: { id: 'bonk', name: 'Bonk', symbol: 'BONK', binanceSymbol: 'BONKUSDT', category: 'MEME', basePrice: 0.00002150, decimals: 8 },
  floki: { id: 'floki', name: 'Floki', symbol: 'FLOKI', binanceSymbol: 'FLOKIUSDT', category: 'MEME', basePrice: 0.0001450, decimals: 6 },
  popcat: { id: 'popcat', name: 'Popcat', symbol: 'POPCAT', binanceSymbol: 'POPCATUSDT', category: 'MEME', basePrice: 1.35, decimals: 2 },
  'pudgy-penguins': { id: 'pudgy-penguins', name: 'Pudgy Penguins', symbol: 'PENGU', binanceSymbol: 'PENGUUSDT', category: 'MEME', basePrice: 0.0380, decimals: 4 },
  bome: { id: 'bome', name: 'BOOK OF MEME', symbol: 'BOME', binanceSymbol: 'BOMEUSDT', category: 'MEME', basePrice: 0.0085, decimals: 6 },
  mew: { id: 'mew', name: 'cat in a dogs world', symbol: 'MEW', binanceSymbol: 'MEWUSDT', category: 'MEME', basePrice: 0.0082, decimals: 6 },
  gala: { id: 'gala', name: 'Gala Games', symbol: 'GALA', binanceSymbol: 'GALAUSDT', category: 'MEME', basePrice: 0.0215, decimals: 4 },
};

export interface CoinFundamentalData {
  name: string;
  symbol: string;
  category: string;
  description: string;
  useCase: string;
  arbitrageSuitability: 'ALTO' | 'MEDIO' | 'MODERADO';
  volatilityProfile: string;
  tags: string[];
  consensusOrType: string;
}

const COIN_FUNDAMENTALS_DATABASE: Record<string, Partial<CoinFundamentalData>> = {
  bitcoin: {
    description: 'La primera y principal criptomoneda descentralizada del mundo, utilizada como reserva de valor digital (oro digital) y activo de liquidación global.',
    useCase: 'Reserva de valor, cobertura macroeconómica y pagos descentralizados.',
    arbitrageSuitability: 'MODERADO',
    volatilityProfile: 'Baja a Media (Ideal para Grid de rango amplio 10%-20%)',
    consensusOrType: 'Proof of Work (PoW) · Capa 1',
    tags: ['Store of Value', 'Layer-1', 'Macro Hedge'],
  },
  ethereum: {
    description: 'Plataforma líder de contratos inteligentes que sustenta la mayoría del ecosistema DeFi, NFTs, stablecoins y Layer-2s.',
    useCase: 'Computación descentralizada, staking y liquidación de redes L2.',
    arbitrageSuitability: 'MEDIO',
    volatilityProfile: 'Media (Excelente oscilación para Grid de 8-12 mallas)',
    consensusOrType: 'Proof of Stake (PoS) · Capa 1',
    tags: ['Smart Contracts', 'DeFi', 'Layer-1'],
  },
  solana: {
    description: 'Blockchain Layer-1 monolítica de ultra alto rendimiento, capaz de procesar miles de transacciones por segundo con tarifas mínimas.',
    useCase: 'DeFi de alta frecuencia, pagos instantáneos, trading descentralizado y memes.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Alta (Máximo rendimiento en Grid Bots por alta frecuencia de rebotes)',
    consensusOrType: 'Proof of History (PoH) + PoS · Capa 1',
    tags: ['High Speed', 'Layer-1', 'DeFi', 'Memes'],
  },
  binancecoin: {
    description: 'Token nativo del ecosistema BNB Chain y exchange Binance, utilizado para tarifas con descuento, gas en BNB Smart Chain y launchpools.',
    useCase: 'Descuento de comisiones, gas EVM y gobernanza.',
    arbitrageSuitability: 'MODERADO',
    volatilityProfile: 'Baja a Media (Tendencia estable y soporte fuerte)',
    consensusOrType: 'Proof of Staked Authority (PoSA) · Capa 1',
    tags: ['Exchange Token', 'Layer-1', 'BNB Chain'],
  },
  ripple: {
    description: 'Red de pagos transfronterizos ultrarrápidos y de bajo coste diseñada para instituciones financieras y transferencias internacionales.',
    useCase: 'Remesas globales, liquidez bajo demanda (ODL) y liquidación bancaria.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Alta en catalizadores de noticias (Grandes oportunidades de scalping)',
    consensusOrType: 'Ripple Protocol Consensus Algorithm (RPCA)',
    tags: ['Payments', 'Enterprise', 'Layer-1'],
  },
  sui: {
    description: 'Blockchain Layer-1 de nueva generación basada en el lenguaje Move, optimizada para procesamiento paralelo de objetos con latencia submétrica.',
    useCase: 'Gaming on-chain, DeFi de alto rendimiento y microtransacciones.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Alta (Tendencia fuerte con oscilaciones ideales para arbitraje)',
    consensusOrType: 'Narwhal & Bullshark PoS (Move Language)',
    tags: ['Move', 'Layer-1', 'High TPS', 'Next-Gen'],
  },
  render: {
    description: 'Red descentralizada de renderizado y cómputo GPU que conecta creadores que necesitan potencia gráfica con proveedores de hardware inactivo.',
    useCase: 'Renderizado 3D, entrenamiento de modelos de IA y efectos visuales descentralizados.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Alta (Gran correlación con sector IA / Big Tech)',
    consensusOrType: 'ERC-20 / SPL Token (Infraestructura Descentralizada DePIN)',
    tags: ['AI', 'DePIN', 'GPU Compute', 'Solana'],
  },
  'fetch-ai': {
    description: 'Plataforma que lidera la Artificial Superintelligence Alliance (ASI), creando agentes de IA autónomos que interactúan y ejecutan tareas complejas.',
    useCase: 'Agentes inteligentes autónomos, optimización de DeFi y servicios de IA.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Muy Alta (Altamente reactivo a noticias de IA generativa)',
    consensusOrType: 'Cosmos SDK / EVM · AI Alliance',
    tags: ['AI Agents', 'ASI Alliance', 'Machine Learning'],
  },
  pepe: {
    description: 'Memecoin deflacionaria líder en Ethereum, convertida en un fenómeno de cultura web con alta liquidez y volumen institucional.',
    useCase: 'Especulación comunitaria, liquidez viral y trading de alta volatilidad.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Extrema (Ideal para Grid Bots con amplio rango defensivo y take-profit rápido)',
    consensusOrType: 'ERC-20 Token (Ethereum)',
    tags: ['Meme', 'Viral', 'High Volatility'],
  },
  near: {
    description: 'Blockchain Layer-1 fragmentada (sharded) centrada en la usabilidad y la integración de Inteligencia Artificial centrada en el usuario (User-Owned AI).',
    useCase: 'Infraestructura Web3, abstracción de cuentas y modelos de IA abiertos.',
    arbitrageSuitability: 'MEDIO',
    volatilityProfile: 'Media-Alta (Excelente comportamiento en canales de soporte/resistencia)',
    consensusOrType: 'Nightshade PoS (Sharding Dinámico)',
    tags: ['AI Infrastructure', 'Layer-1', 'Sharding'],
  },
  dogwifhat: {
    description: 'Memecoin insignia de la red Solana con un sombrero rosa, respaldada por una de las comunidades más activas y líquidas del mercado cripto.',
    useCase: 'Cultura meme descentralizada y arbitraje de impulso en Solana.',
    arbitrageSuitability: 'ALTO',
    volatilityProfile: 'Extrema (Movimientos porcentuales diarios de dos dígitos)',
    consensusOrType: 'SPL Token (Solana)',
    tags: ['Meme', 'Solana', 'Community'],
  },
  uniswap: {
    description: 'El protocolo de intercambio descentralizado (DEX) automatizado líder en Ethereum y múltiples redes L2.',
    useCase: 'Provisión de liquidez automatizada (AMM) y swap descentralizado.',
    arbitrageSuitability: 'MEDIO',
    volatilityProfile: 'Media (Resistencias técnicas muy respetadas)',
    consensusOrType: 'Gobernanza ERC-20 / Protocolo AMM',
    tags: ['DeFi', 'DEX', 'AMM Leader'],
  },
};

/**
 * Obtiene la ficha fundamental completa para cualquier activo
 */
export function getCoinFundamentals(coin: CoinInfo): CoinFundamentalData {
  const custom = COIN_FUNDAMENTALS_DATABASE[coin.id] || {};
  const categoryLabels: Record<string, string> = {
    TOP: 'Capa 1 & Activo Principal',
    AI: 'Inteligencia Artificial & Big Data',
    DEFI: 'Finanzas Descentralizadas (DeFi)',
    MEME: 'Memecoin & Alta Volatilidad',
    L2: 'Capa 2 & Escalabilidad Modular',
  };

  return {
    name: coin.name,
    symbol: coin.symbol,
    category: categoryLabels[coin.category] || coin.category,
    description: custom.description || `${coin.name} (${coin.symbol}) es un activo digital negociado en el mercado spot con liquidez global en Binance.`,
    useCase: custom.useCase || `Intercambio de valor, posicionamiento en el mercado spot y arbitraje automatizado en pares USDT.`,
    arbitrageSuitability: custom.arbitrageSuitability || (coin.category === 'MEME' || coin.category === 'AI' ? 'ALTO' : 'MEDIO'),
    volatilityProfile: custom.volatilityProfile || `Oscilación típica del sector ${coin.category}. Apto para mallas Grid automatizadas.`,
    consensusOrType: custom.consensusOrType || `Mercado Spot · Par ${coin.symbol}/USDT`,
    tags: custom.tags || [coin.category, 'Binance Spot', 'Arbitraje Grid'],
  };
}

/**
 * Universal dynamic resolver for any coin ID or symbol (Curated or discovered from Binance).
 */
export const getDynamicCoinInfo = (idOrSymbol: string): CoinInfo => {
  if (!idOrSymbol) return COINS.solana;
  const clean = idOrSymbol.toLowerCase().trim();
  const upper = idOrSymbol.toUpperCase().trim();

  // Filter out known invalid non-spot tokens
  if (clean === 'anthropic' || clean === 'anthropicusdt') {
    return COINS.solana;
  }

  // 1. Direct key match in COINS
  if (COINS[clean]) return COINS[clean];

  // 2. Check by symbol in COINS
  const bySymbol = Object.values(COINS).find(
    (c) =>
      c.symbol.toUpperCase() === upper ||
      c.binanceSymbol === upper + 'USDT' ||
      c.binanceSymbol === upper ||
      c.name.toUpperCase() === upper
  );
  if (bySymbol) return bySymbol;

  // 3. Construct on-the-fly CoinInfo for any valid Binance pair
  const baseSymbol = upper.replace(/USDT$/, '');
  const binanceSymbol = baseSymbol + 'USDT';
  const newCoin: CoinInfo = {
    id: baseSymbol.toLowerCase(),
    name: baseSymbol,
    symbol: baseSymbol,
    binanceSymbol,
    category: 'TOP',
    basePrice: 1.0,
    decimals: 2,
  };
  COINS[newCoin.id] = newCoin;
  return newCoin;
};

/**
 * Fetch live USD to PEN exchange rate from public currency API with fallback
 */
export async function fetchLiveUsdPenRate(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.statusText}`);
    const data = await res.json();
    if (data && data.rates && data.rates.PEN) {
      const rate = Number(parseFloat(data.rates.PEN).toFixed(3));
      localStorage.setItem('crypto_analyzer_live_pen_rate', rate.toString());
      return rate;
    }
  } catch (e) {
    console.info('Live USD/PEN API notice:', e);
  }
  const cached = localStorage.getItem('crypto_analyzer_live_pen_rate');
  return cached ? parseFloat(cached) : 3.75;
}

/**
 * Universal resolution helper to get exact CoinInfo from a bot row or symbol string.
 */
export const resolveBotCoin = (bot: { coin_id?: string; name?: string }): CoinInfo => {
  if (bot.coin_id) {
    return getDynamicCoinInfo(bot.coin_id);
  }
  if (bot.name) {
    return getDynamicCoinInfo(bot.name);
  }
  return COINS.solana;
};

/**
 * Precise timestamp formatter for trade history and order fills
 */
export function formatTradeTime(timestamp?: string | number): { time: string; date: string; full: string; relative: string } {
  if (!timestamp) {
    const now = new Date();
    const time = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const date = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    return { time, date, full: `${date} ${time}`, relative: 'Ahora' };
  }

  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    const time = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const date = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    return { time, date, full: `${date} ${time}`, relative: 'Ahora' };
  }

  const time = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const date = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });

  const diffSec = Math.floor((Date.now() - dateObj.getTime()) / 1000);
  let relative = 'Ahora';
  if (diffSec >= 0 && diffSec < 60) relative = `hace ${diffSec}s`;
  else if (diffSec >= 60 && diffSec < 3600) relative = `hace ${Math.floor(diffSec / 60)}m`;
  else if (diffSec >= 3600 && diffSec < 86400) relative = `hace ${Math.floor(diffSec / 3600)}h`;
  else relative = `${date}`;

  return { time, date, full: `${date} ${time}`, relative };
}

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DynamicLevelItem {
  price: number;
  pct: number;
}

export interface QuantitativeAnalysis {
  rsi: number;
  ema20: number;
  atr: number;
  atrPercent: number;
  momentumScore: number;
  signalType: 'BUY' | 'SELL' | 'WAIT' | 'AVOID';
  badge: string;
  plainExplanation: string;
  levels: {
    entryLimit: number;
    takeProfit1: DynamicLevelItem;
    takeProfit2: DynamicLevelItem;
    takeProfit3: DynamicLevelItem;
    stopLoss: DynamicLevelItem;
    riskRewardRatio: number;
  };
  aiGrid: {
    priceLow: number;
    priceHigh: number;
    recommendedGrids: number;
    profitPerGridPct: number;
    suggestedStopLoss: number;
  };
}

export interface LiveNotificationEvent {
  id: string;
  type: 'opportunity' | 'caution' | 'info' | 'system';
  coinId: string;
  coinSymbol: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  timeStr: string;
  timestamp: number;
}

/**
 * Format any crypto price with adaptive precision (2 to 8 decimals) and currency conversion
 */
export function formatDynamicPrice(
  price: number,
  decimals: number = 2,
  currency: 'USD' | 'PEN' = 'USD',
  penRate: number = 3.75
): string {
  const converted = currency === 'PEN' ? price * penRate : price;
  const symbol = currency === 'PEN' ? 'S/ ' : '$';

  if (converted >= 1000) {
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (converted >= 1) {
    return `${symbol}${converted.toFixed(2)}`;
  } else if (converted >= 0.01) {
    return `${symbol}${converted.toFixed(4)}`;
  } else if (converted > 0) {
    return `${symbol}${converted.toFixed(Math.max(4, decimals))}`;
  }
  return `${symbol}0.00`;
}

/**
 * Fetch real historical candles from Binance Public API (Supports 1m, 5m, 15m, 1h, 4h, 1d)
 * Queries data-api.binance.vision, api.binance.com, and fapi.binance.com with multi-endpoint fallback.
 */
export async function fetchRealBinanceKlines(
  binanceSymbol: string,
  interval: string = '1h',
  limit: number = 300,
  basePrice: number = 100
): Promise<CandleData[]> {
  try {
    const endpoints = [
      `https://data-api.binance.vision/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
      `https://fapi.binance.com/fapi/v1/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
    ];

    let data: any = null;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          data = await res.json();
          if (Array.isArray(data) && data.length > 0) break;
        }
      } catch {}
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`All Binance kline endpoints failed for ${binanceSymbol}`);
    }

    return data.map((item: any[]) => ({
      time: Math.floor(Number(item[0]) / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  } catch (err) {
    console.warn(`Could not fetch live klines for ${binanceSymbol}, using fallback:`, err);
    return generateBackupCandles(basePrice, limit);
  }
}

/**
 * Fetch 24h ticker statistics from Binance Public API (Spot with Futures fallback)
 */
export async function fetchRealBinance24hStats(binanceSymbol: string) {
  try {
    let res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
    if (!res.ok) {
      res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${binanceSymbol}`);
    }
    if (!res.ok) throw new Error(`Binance 24hr error: ${res.statusText}`);
    const data = await res.json();

    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      vol24h: parseFloat(data.quoteVolume),
    };
  } catch (err) {
    console.warn(`Could not fetch 24h stats for ${binanceSymbol}:`, err);
    return null;
  }
}

/**
 * Fetch all 24h ticker statistics in a SINGLE ultra-fast call (~150ms) from Binance Public API.
 * Dynamically ingests all active USDT trading pairs on Binance Spot AND Futures, filtering by liquidity (>= $2.0M volume)
 * to expand the catalog dynamically to 140-180+ coins with 100% real prices.
 */
export async function fetchAllCoins24hStats(): Promise<Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }>> {
  try {
    const [spotRes, futuresRes] = await Promise.allSettled([
      fetch('https://data-api.binance.vision/api/v3/ticker/24hr').catch(() => fetch('https://api.binance.com/api/v3/ticker/24hr')),
      fetch('https://fapi.binance.com/fapi/v1/ticker/24hr').catch(() => null),
    ]);

    const spotData: Array<{ symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }> =
      spotRes.status === 'fulfilled' && spotRes.value && spotRes.value.ok ? await spotRes.value.json() : [];

    const futuresData: Array<{ symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }> =
      futuresRes.status === 'fulfilled' && futuresRes.value && futuresRes.value.ok ? await futuresRes.value.json() : [];

    const EXCLUDED_SYMBOLS = new Set([
      'USDCUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'EURUSDT', 'USDPUSDT', 'AEURUSDT', 'BUSDUSDT', 'DAIUSDT', 'WBTCUSDT', 'USDEUSDT',
      'USTCUSDT', 'EURIUSDT',
    ]);

    // Build curated lookup table by Binance Symbol
    const curatedByBinanceSym = new Map<string, CoinInfo>();
    Object.values(COINS).forEach((c) => {
      curatedByBinanceSym.set(c.binanceSymbol, c);
    });

    const result: Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }> = {};
    const seenSymbols = new Set<string>();

    const processItem = (item: { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }) => {
      if (!item.symbol.endsWith('USDT')) return;
      if (EXCLUDED_SYMBOLS.has(item.symbol)) return;
      if (seenSymbols.has(item.symbol)) return;
      // Skip leveraged tokens
      if (item.symbol.includes('UPUSDT') || item.symbol.includes('DOWNUSDT') || item.symbol.includes('BEARUSDT') || item.symbol.includes('BULLUSDT')) return;

      const vol24h = parseFloat(item.quoteVolume) || 0;
      const isCurated = curatedByBinanceSym.has(item.symbol);

      // Liquidity Hard Gate: Volume >= $2.0M USDT (or in curated list)
      if (vol24h < 2_000_000 && !isCurated) return;

      seenSymbols.add(item.symbol);

      const baseSymbol = item.symbol.replace(/USDT$/, '');
      const price = parseFloat(item.lastPrice) || 1.0;
      const change24h = parseFloat(item.priceChangePercent) || 0;
      const high24h = parseFloat(item.highPrice) || price * 1.03;
      const low24h = parseFloat(item.lowPrice) || price * 0.97;

      let coinInfo: CoinInfo;
      if (isCurated) {
        coinInfo = curatedByBinanceSym.get(item.symbol)!;
      } else {
        const id = baseSymbol.toLowerCase();
        const decimals = price >= 1000 ? 2 : price >= 1 ? 2 : price >= 0.01 ? 4 : price >= 0.0001 ? 6 : 8;
        coinInfo = {
          id,
          name: baseSymbol,
          symbol: baseSymbol,
          binanceSymbol: item.symbol,
          category: 'TOP',
          basePrice: price,
          decimals,
        };
        COINS[id] = coinInfo;
      }

      // Estimate 7d trend from 24h momentum + range position
      const rangePos = high24h > low24h ? (price - low24h) / (high24h - low24h) : 0.5;
      const change7d = Number((change24h * 1.35 + (rangePos - 0.5) * 4).toFixed(2));
      
      // Realistic Wilder RSI estimate calibrated to 24h delta & range position
      const rsi = Math.max(15, Math.min(88, Number((48 + change24h * 1.6 + (rangePos - 0.5) * 12).toFixed(1))));
      
      // Institutional Momentum Score (0-100) weighting Volume & 24h change
      const volBonus = vol24h > 200_000_000 ? 6 : vol24h > 50_000_000 ? 3 : 0;
      const momentum = Math.max(10, Math.min(96, Math.round(50 + change24h * 2.0 + volBonus)));

      result[coinInfo.id] = { price, change24h, high24h, low24h, vol24h, change7d, rsi, momentum };
    };

    spotData.forEach(processItem);
    futuresData.forEach(processItem);

    try {
      localStorage.setItem('crypto_analyzer_last_ticker_stats', JSON.stringify(result));
    } catch {}

    return result;
  } catch (err) {
    console.warn('Could not fetch bulk ticker from Binance, using cached fallback:', err);
    try {
      const cached = localStorage.getItem('crypto_analyzer_last_ticker_stats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {}

    const fallbackResult: Record<string, any> = {};
    Object.entries(COINS).forEach(([id, coin]) => {
      fallbackResult[id] = {
        price: coin.basePrice,
        change24h: 0,
        high24h: coin.basePrice * 1.04,
        low24h: coin.basePrice * 0.96,
        vol24h: 15000000,
        change7d: 0,
        rsi: 50,
        momentum: 50,
      };
    });
    return fallbackResult;
  }
}

/**
 * Fetch real Order Book depth from Binance Public API (Spot with Futures fallback)
 */
export async function fetchRealBinanceDepth(
  binanceSymbol: string,
  limit: number = 20,
  basePrice: number = 100
): Promise<{ asks: OrderBookItem[]; bids: OrderBookItem[] }> {
  try {
    let res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`);
    if (!res.ok) {
      res = await fetch(`https://fapi.binance.com/fapi/v1/depth?symbol=${binanceSymbol}&limit=${limit}`);
    }
    if (!res.ok) throw new Error(`Binance Depth error: ${res.statusText}`);
    const data = await res.json();

    let askTotal = 0;
    const rawAsks = data.asks.map((item: string[]) => {
      const price = parseFloat(item[0]);
      const size = parseFloat(item[1]);
      askTotal += size;
      return { price, size, total: askTotal };
    });

    let bidTotal = 0;
    const rawBids = data.bids.map((item: string[]) => {
      const price = parseFloat(item[0]);
      const size = parseFloat(item[1]);
      bidTotal += size;
      return { price, size, total: bidTotal };
    });

    const maxDepthTotal = Math.max(askTotal, bidTotal, 1);

    const asks: OrderBookItem[] = rawAsks.map((item: any) => ({
      ...item,
      depthPct: Math.min(100, (item.total / maxDepthTotal) * 100),
    }));

    const bids: OrderBookItem[] = rawBids.map((item: any) => ({
      ...item,
      depthPct: Math.min(100, (item.total / maxDepthTotal) * 100),
    }));

    return { asks, bids };
  } catch (err) {
    console.warn(`Could not fetch depth for ${binanceSymbol}:`, err);
    return generateOrderBook(basePrice, limit);
  }
}

/**
 * Quantitative Analysis Engine (Direct port of engine.py logic without emojis)
 */
export function calculateQuantitativeAnalysis(
  candles: CandleData[],
  currentPrice: number,
  decimals: number = 2
): QuantitativeAnalysis {
  if (candles.length < 20) {
    const entryLimit = Number((currentPrice * 0.985).toFixed(decimals));
    const tp1Price = Number((currentPrice * 1.022).toFixed(decimals));
    const tp2Price = Number((currentPrice * 1.048).toFixed(decimals));
    const tp3Price = Number((currentPrice * 1.085).toFixed(decimals));
    const slPrice = Number((currentPrice * 0.968).toFixed(decimals));

    return {
      rsi: 50.0,
      ema20: currentPrice,
      atr: currentPrice * 0.03,
      atrPercent: 3.0,
      momentumScore: 50.0,
      signalType: 'WAIT',
      badge: 'ESPERAR CONFIRMACION',
      plainExplanation: 'Calculando datos de mercado suficientes para confirmar tendencia.',
      levels: {
        entryLimit,
        takeProfit1: { price: tp1Price, pct: 2.2 },
        takeProfit2: { price: tp2Price, pct: 4.8 },
        takeProfit3: { price: tp3Price, pct: 8.5 },
        stopLoss: { price: slPrice, pct: -3.2 },
        riskRewardRatio: 2.4,
      },
      aiGrid: {
        priceLow: Number((currentPrice * 0.94).toFixed(decimals)),
        priceHigh: Number((currentPrice * 1.06).toFixed(decimals)),
        recommendedGrids: 6,
        profitPerGridPct: 2.1,
        suggestedStopLoss: Number((currentPrice * 0.90).toFixed(decimals)),
      },
    };
  }

  // 1. Calculate EMA-20
  const period = 20;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let ema20 = sum / period;
  for (let i = period; i < candles.length; i++) {
    ema20 = candles[i].close * k + ema20 * (1 - k);
  }

  // 2. Calculate RSI (14)
  const rsiPeriod = 14;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= rsiPeriod; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / rsiPeriod;
  let avgLoss = losses / rsiPeriod;

  for (let i = rsiPeriod + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (rsiPeriod - 1) + diff) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1)) / rsiPeriod;
    } else {
      avgGain = (avgGain * (rsiPeriod - 1)) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + Math.abs(diff)) / rsiPeriod;
    }
  }
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));

  // 3. Calculate ATR (14)
  let trSum = 0;
  for (let i = 1; i < Math.min(15, candles.length); i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trSum += tr;
  }
  const atr = trSum / 14;
  const atrPercent = Number(((atr / currentPrice) * 100).toFixed(2));

  // 4. Calculate Momentum Score (0 - 100)
  const priceVsEmaPct = ((currentPrice - ema20) / ema20) * 100;
  let momentumScore = 50 + priceVsEmaPct * 5 + (rsi - 50) * 0.5;
  momentumScore = Math.max(5, Math.min(95, Number(momentumScore.toFixed(1))));

  // 5. Semantic Signal Decision (Without Emojis)
  let signalType: 'BUY' | 'SELL' | 'WAIT' | 'AVOID' = 'WAIT';
  let badge = 'ESPERAR CONFIRMACION';
  let plainExplanation = 'El precio se mantiene oscilando en canal neutral sin ruptura confirmada.';

  if (rsi <= 38 && currentPrice <= ema20 * 1.02) {
    signalType = 'BUY';
    badge = 'COMPRA LISTA AHORA';
    plainExplanation = `Precio en soporte clave con RSI en sobreventa (${rsi}). Alta probabilidad matemática de rebote alcista.`;
  } else if (rsi >= 70 && currentPrice > ema20) {
    signalType = 'SELL';
    badge = 'VENTA SUGERIDA';
    plainExplanation = `RSI en zona de sobrecompra (${rsi}). Se recomienda tomar ganancias o ajustar Stop Loss.`;
  } else if (rsi < 28 && momentumScore < 25) {
    signalType = 'AVOID';
    badge = 'EVITAR RIESGO';
    plainExplanation = 'Mercado en fuerte presión bajista o capitulación. Se recomienda pausar compras de Grid.';
  }

  // 6. Dynamic Levels Calculation (TP1, TP2, TP3, Stop Loss, Risk:Reward)
  const entryDiscountPct = Math.max(0.5, Math.min(2.5, atrPercent * 0.5));
  const entryLimit = Number((currentPrice * (1 - entryDiscountPct / 100)).toFixed(decimals));

  const tp1Pct = Number((Math.max(1.5, atrPercent * 0.9)).toFixed(2));
  const tp2Pct = Number((Math.max(3.5, atrPercent * 1.8)).toFixed(2));
  const tp3Pct = Number((Math.max(7.0, atrPercent * 3.2)).toFixed(2));
  const slPct = Number((Math.max(2.0, atrPercent * 1.2)).toFixed(2));

  const tp1Price = Number((entryLimit * (1 + tp1Pct / 100)).toFixed(decimals));
  const tp2Price = Number((entryLimit * (1 + tp2Pct / 100)).toFixed(decimals));
  const tp3Price = Number((entryLimit * (1 + tp3Pct / 100)).toFixed(decimals));
  const slPrice = Number((entryLimit * (1 - slPct / 100)).toFixed(decimals));

  const rrRatio = Number(((tp2Price - entryLimit) / Math.max(0.0001, entryLimit - slPrice)).toFixed(2));

  // 7. Optimal AI Grid Range Calculation (ATR-based dynamic channel)
  const multiplier = 2.2;
  const priceLow = Math.max(0.000001, Number((currentPrice - atr * multiplier).toFixed(decimals)));
  const priceHigh = Number((currentPrice + atr * multiplier).toFixed(decimals));
  const suggestedStopLoss = Math.max(0.000001, Number((priceLow - atr * 1.0).toFixed(decimals)));
  const recommendedGrids = Math.max(4, Math.min(12, Math.round((atrPercent / 100) * 120)));
  const step = (priceHigh - priceLow) / (recommendedGrids - 1);
  const profitPerGridPct = Number((((step / priceLow) * 100) - 0.2).toFixed(2));

  return {
    rsi,
    ema20: Number(ema20.toFixed(decimals)),
    atr: Number(atr.toFixed(decimals)),
    atrPercent,
    momentumScore,
    signalType,
    badge,
    plainExplanation,
    levels: {
      entryLimit,
      takeProfit1: { price: tp1Price, pct: tp1Pct },
      takeProfit2: { price: tp2Price, pct: tp2Pct },
      takeProfit3: { price: tp3Price, pct: tp3Pct },
      stopLoss: { price: slPrice, pct: -slPct },
      riskRewardRatio: Math.max(1.0, rrRatio),
    },
    aiGrid: {
      priceLow,
      priceHigh,
      recommendedGrids,
      profitPerGridPct: Math.max(0.5, profitPerGridPct),
      suggestedStopLoss,
    },
  };
}

export function calculateEMA20(candles: CandleData[]): Array<{ time: number; value: number }> {
  const period = 20;
  const k = 2 / (period + 1);
  const emaData: Array<{ time: number; value: number }> = [];

  if (candles.length < period) return emaData;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let prevEMA = sum / period;
  emaData.push({ time: candles[period - 1].time, value: Number(prevEMA.toFixed(4)) });

  for (let i = period; i < candles.length; i++) {
    const currentEMA = candles[i].close * k + prevEMA * (1 - k);
    emaData.push({ time: candles[i].time, value: Number(currentEMA.toFixed(4)) });
    prevEMA = currentEMA;
  }

  return emaData;
}

export interface GridLevelItem {
  id?: string;
  botId?: string;
  coinId?: string;
  level: number;
  price: number;
  allocationUsd: number;
  side: 'BUY' | 'SELL';
  status: 'PENDING' | 'FILLED';
  entryPrice?: number;
}

export interface OrderBookItem {
  price: number;
  size: number;
  total: number;
  depthPct: number;
}

export function generateBackupCandles(basePrice: number = 100, count: number = 80): CandleData[] {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 300;
  let currentPrice = basePrice * 0.98;
  const decimals = basePrice >= 1000 ? 2 : basePrice >= 1 ? 2 : basePrice >= 0.01 ? 4 : 8;

  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const change = (Math.random() - 0.49) * (basePrice * 0.008);
    const open = currentPrice;
    const close = Math.max(0.000001, open + change);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.004);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.004);
    const volume = Math.random() * 50000 + 10000;

    candles.push({
      time,
      open: Number(open.toFixed(decimals)),
      high: Number(high.toFixed(decimals)),
      low: Number(low.toFixed(decimals)),
      close: Number(close.toFixed(decimals)),
      volume: Number(volume.toFixed(2)),
    });

    currentPrice = close;
  }

  return candles;
}

export function generateOrderBook(currentPrice: number, count: number = 10): { asks: OrderBookItem[]; bids: OrderBookItem[] } {
  const asks: OrderBookItem[] = [];
  const bids: OrderBookItem[] = [];
  const spreadStep = Math.max(currentPrice * 0.0006, 0.000001);
  const decimals = currentPrice >= 1000 ? 2 : currentPrice >= 1 ? 2 : currentPrice >= 0.01 ? 4 : 8;

  let askTotal = 0;
  for (let i = 1; i <= count; i++) {
    const price = currentPrice + (count - i + 1) * spreadStep;
    const size = Math.random() * 45 + 5;
    askTotal += size;
    asks.push({
      price: Number(price.toFixed(decimals)),
      size: Number(size.toFixed(2)),
      total: Number(askTotal.toFixed(2)),
      depthPct: Math.min(100, (askTotal / 300) * 100),
    });
  }

  let bidTotal = 0;
  for (let i = 1; i <= count; i++) {
    const price = currentPrice - i * spreadStep;
    const size = Math.random() * 45 + 5;
    bidTotal += size;
    bids.push({
      price: Number(price.toFixed(decimals)),
      size: Number(size.toFixed(2)),
      total: Number(bidTotal.toFixed(2)),
      depthPct: Math.min(100, (bidTotal / 300) * 100),
    });
  }

  return { asks, bids };
}

/**
 * Generate simulated live feed events from quantitative indicators
 */
export function generateLiveFeedEvents(
  liveStats: Record<string, { price: number; change24h: number }>
): LiveNotificationEvent[] {
  const events: LiveNotificationEvent[] = [];
  const now = Date.now();

  const coinEntries = Object.entries(COINS);
  coinEntries.forEach(([id, coin], idx) => {
    const stat = liveStats[id];
    const change = stat ? stat.change24h : 0;
    const price = stat ? stat.price : coin.basePrice;

    if (change > 4.0) {
      events.push({
        id: `ev-opp-${id}`,
        type: 'opportunity',
        coinId: id,
        coinSymbol: coin.symbol,
        badge: 'OPORTUNIDAD ALCISTA',
        badgeColor: '#0ECB81',
        title: `${coin.name} (${coin.symbol}) en impulso +${change.toFixed(2)}%`,
        description: `Ruptura con volumen y momentum positivo. Configuración óptima para entrada en soporte.`,
        timeStr: `Hace ${idx + 2} min`,
        timestamp: now - (idx + 2) * 60000,
      });
    } else if (change < -4.0) {
      events.push({
        id: `ev-caut-${id}`,
        type: 'caution',
        coinId: id,
        coinSymbol: coin.symbol,
        badge: 'PRECAUCION ATR',
        badgeColor: '#F6465D',
        title: `${coin.name} (${coin.symbol}) retroceso ${change.toFixed(2)}%`,
        description: `Volatilidad incrementada. Se recomienda esperar soporte antes de posicionar órdenes.`,
        timeStr: `Hace ${idx + 5} min`,
        timestamp: now - (idx + 5) * 60000,
      });
    } else {
      if (idx % 3 === 0) {
        events.push({
          id: `ev-info-${id}`,
          type: 'info',
          coinId: id,
          coinSymbol: coin.symbol,
          badge: 'SOPORTE CONFIRMADO',
          badgeColor: '#F0B90B',
          title: `${coin.name} consolidando en $${price >= 1 ? price.toFixed(2) : price.toFixed(4)}`,
          description: `Canal lateral con RSI equilibrado. Frecuencia adecuada para Grid Trading.`,
          timeStr: `Hace ${idx + 8} min`,
          timestamp: now - (idx + 8) * 60000,
        });
      }
    }
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
}
