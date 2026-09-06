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
  bitcoin: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', binanceSymbol: 'BTCUSDT', category: 'TOP', basePrice: 89500.00, decimals: 2 },
  ethereum: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', binanceSymbol: 'ETHUSDT', category: 'TOP', basePrice: 2280.00, decimals: 2 },
  solana: { id: 'solana', name: 'Solana', symbol: 'SOL', binanceSymbol: 'SOLUSDT', category: 'TOP', basePrice: 178.20, decimals: 2 },
  binancecoin: { id: 'binancecoin', name: 'BNB Chain', symbol: 'BNB', binanceSymbol: 'BNBUSDT', category: 'TOP', basePrice: 615.40, decimals: 2 },
  ripple: { id: 'ripple', name: 'Ripple', symbol: 'XRP', binanceSymbol: 'XRPUSDT', category: 'TOP', basePrice: 1.4200, decimals: 4 },
  cardano: { id: 'cardano', name: 'Cardano', symbol: 'ADA', binanceSymbol: 'ADAUSDT', category: 'TOP', basePrice: 0.7840, decimals: 4 },
  avalanche: { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', binanceSymbol: 'AVAXUSDT', category: 'TOP', basePrice: 28.80, decimals: 2 },
  sui: { id: 'sui', name: 'Sui Network', symbol: 'SUI', binanceSymbol: 'SUIUSDT', category: 'TOP', basePrice: 2.85, decimals: 2 },
  polkadot: { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', binanceSymbol: 'DOTUSDT', category: 'TOP', basePrice: 5.25, decimals: 2 },
  chainlink: { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', binanceSymbol: 'LINKUSDT', category: 'TOP', basePrice: 18.45, decimals: 2 },
  polygon: { id: 'polygon', name: 'Polygon', symbol: 'POL', binanceSymbol: 'POLUSDT', category: 'TOP', basePrice: 0.3850, decimals: 4 },
  tron: { id: 'tron', name: 'TRON', symbol: 'TRX', binanceSymbol: 'TRXUSDT', category: 'TOP', basePrice: 0.2480, decimals: 4 },
  aptos: { id: 'aptos', name: 'Aptos', symbol: 'APT', binanceSymbol: 'APTUSDT', category: 'TOP', basePrice: 8.90, decimals: 2 },
  celestia: { id: 'celestia', name: 'Celestia', symbol: 'TIA', binanceSymbol: 'TIAUSDT', category: 'TOP', basePrice: 5.10, decimals: 2 },
  cosmos: { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', binanceSymbol: 'ATOMUSDT', category: 'TOP', basePrice: 4.80, decimals: 2 },
  sei: { id: 'sei', name: 'Sei Network', symbol: 'SEI', binanceSymbol: 'SEIUSDT', category: 'TOP', basePrice: 0.4200, decimals: 4 },
  hedera: { id: 'hedera', name: 'Hedera', symbol: 'HBAR', binanceSymbol: 'HBARUSDT', category: 'TOP', basePrice: 0.2250, decimals: 4 },
  algorand: { id: 'algorand', name: 'Algorand', symbol: 'ALGO', binanceSymbol: 'ALGOUSDT', category: 'TOP', basePrice: 0.2820, decimals: 4 },
  'internet-computer': { id: 'internet-computer', name: 'Internet Computer', symbol: 'ICP', binanceSymbol: 'ICPUSDT', category: 'TOP', basePrice: 11.50, decimals: 2 },
  vechain: { id: 'vechain', name: 'VeChain', symbol: 'VET', binanceSymbol: 'VETUSDT', category: 'TOP', basePrice: 0.0340, decimals: 4 },
  filecoin: { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', binanceSymbol: 'FILUSDT', category: 'TOP', basePrice: 4.80, decimals: 2 },

  // ─── 2. BITCOIN ECOSYSTEM & BREAKOUTS (2) ───
  stacks: { id: 'stacks', name: 'Stacks (Bitcoin L2)', symbol: 'STX', binanceSymbol: 'STXUSDT', category: 'TOP', basePrice: 1.85, decimals: 2 },
  ordinals: { id: 'ordinals', name: 'Ordinals', symbol: 'ORDI', binanceSymbol: 'ORDIUSDT', category: 'TOP', basePrice: 38.50, decimals: 2 },

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
  raydium: { id: 'raydium', name: 'Raydium', symbol: 'RAY', binanceSymbol: 'RAYUSDT', category: 'DEFI', basePrice: 4.80, decimals: 2 },
  pyth: { id: 'pyth', name: 'Pyth Network', symbol: 'PYTH', binanceSymbol: 'PYTHUSDT', category: 'DEFI', basePrice: 0.3950, decimals: 4 },
  dydx: { id: 'dydx', name: 'dYdX Protocol', symbol: 'DYDX', binanceSymbol: 'DYDXUSDT', category: 'DEFI', basePrice: 1.15, decimals: 2 },
  lido: { id: 'lido', name: 'Lido DAO', symbol: 'LDO', binanceSymbol: 'LDOUSDT', category: 'DEFI', basePrice: 1.25, decimals: 2 },

  // ─── 6. MEMES & HIGH VOLATILITY (9) ───
  dogecoin: { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', binanceSymbol: 'DOGEUSDT', category: 'MEME', basePrice: 0.1420, decimals: 4 },
  'shiba-inu': { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', binanceSymbol: 'SHIBUSDT', category: 'MEME', basePrice: 0.00001735, decimals: 8 },
  pepe: { id: 'pepe', name: 'Pepe', symbol: 'PEPE', binanceSymbol: 'PEPEUSDT', category: 'MEME', basePrice: 0.00000985, decimals: 8 },
  dogwifhat: { id: 'dogwifhat', name: 'dogwifhat', symbol: 'WIF', binanceSymbol: 'WIFUSDT', category: 'MEME', basePrice: 2.45, decimals: 2 },
  bonk: { id: 'bonk', name: 'Bonk', symbol: 'BONK', binanceSymbol: 'BONKUSDT', category: 'MEME', basePrice: 0.00002150, decimals: 8 },
  floki: { id: 'floki', name: 'Floki', symbol: 'FLOKI', binanceSymbol: 'FLOKIUSDT', category: 'MEME', basePrice: 0.0001450, decimals: 6 },
  'pudgy-penguins': { id: 'pudgy-penguins', name: 'Pudgy Penguins', symbol: 'PENGU', binanceSymbol: 'PENGUUSDT', category: 'MEME', basePrice: 0.0380, decimals: 4 },
  bome: { id: 'bome', name: 'BOOK OF MEME', symbol: 'BOME', binanceSymbol: 'BOMEUSDT', category: 'MEME', basePrice: 0.0085, decimals: 6 },
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
/**
 * Systematic Rule-Based Sanitizer for Spot Cryptocurrencies:
 * Automatically detects and purges non-crypto assets, commodities, forex/fiat,
 * stablecoins, leveraged tokens, futures multipliers, and synthetic derivatives.
 */
const FIAT_STABLECOIN_SYMBOLS = new Set([
  'usdc', 'fdusd', 'tusd', 'eur', 'usdp', 'aeur', 'busd', 'dai', 'wbtc', 'usde',
  'ustc', 'euri', 'aud', 'gbp', 'brl', 'try', 'rub', 'cop', 'mxn', 'ars', 'clp', 'cad', 'chf', 'jpy',
  'usd1', 'rlusd', 'usdd', 'pyusd', 'crvusd', 'usds', 'frax', 'lusd', 'susd', 'gusd', 'eurt'
]);

/**
 * Blacklist estricta de tokens deslistados históricamente, futuros sin spot, activos fantasma,
 * acciones tokenizadas (bStocks), comodities y derivados sintéticos.
 */
export const NON_SPOT_OR_HALTED_SYMBOLS = new Set([
  'akt', 'akash', 'kas', 'kaspa', 'popcat', 'mew', 'ton', 'toncoin', 'ftm', 'fantom', 'mkr', 'maker',
  'bcc', 'ven', 'pax', 'bchabc', 'bchsv', 'usdsold', 'nano', 'usdsb', 'erd', 'npxs', 'storm', 'hc',
  'mco', 'strat', 'xzc', 'gxs', 'lend', 'bkrw', 'bzrx', 'susd', 'ramp', 'eps', 'nu', 'keep', 'rgt',
  'any', 'wnxm', 'mir', 'anc', 'yfidown', 'yfii', 'tribet', 'btg', 'beam', 'nebl', 'auto', 'vgx',
  'snm', 'qlc', 'bnt', 'drep', 'pnt', 'mob', 'mdx', 'dgb', 'reiv', 'unfi', 'kp3r',
  // Purged bStocks / Tokenized Equities
  'sndkb', 'crclb', 'mstrb', 'nvdb', 'tslab', 'applb', 'amznb', 'msftb', 'coinb', 'pltrb', 'hoodb', 'cohrb', 'skhyb',
  // Purged commodities / ordinals
  'paxg', 'sats', '1000sats'
]);

// Canonical major symbol mapping accessible throughout module
export const CANONICAL_ALIASES: Record<string, string> = {
  bnb: 'binancecoin',
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  ada: 'cardano',
  xrp: 'ripple',
  avax: 'avalanche',
  dot: 'polkadot',
  link: 'chainlink',
  doge: 'dogecoin',
  shib: 'shiba-inu',
  matic: 'polygon',
  pol: 'polygon',
  arb: 'arbitrum',
  op: 'optimism',
  ftm: 'fantom',
  inj: 'injective',
  uni: 'uniswap',
  sui: 'sui',
  ton: 'toncoin',
  rndr: 'render',
  render: 'render',
  fet: 'fetch-ai',
  tao: 'bittensor',
  wld: 'worldcoin',
  grt: 'the-graph',
  io: 'io-net',
  icp: 'internet-computer',
  wif: 'dogwifhat',
  pengu: 'pudgy-penguins',
  trx: 'tron',
  atom: 'cosmos',
  hbar: 'hedera',
  algo: 'algorand',
  vet: 'vechain',
  fil: 'filecoin',
  stx: 'stacks',
  ordi: 'ordinals',
  zro: 'layerzero',
  strk: 'starknet',
  manta: 'manta',
  move: 'movement',
  saga: 'saga',
  jup: 'jupiter',
  ena: 'ethena',
  ondo: 'ondo',
  ray: 'raydium',
  ldo: 'lido',
  dydx: 'dydx',
  pendle: 'pendle',
  pyth: 'pyth',
  bonk: 'bonk',
  floki: 'floki',
  bome: 'bome',
  gala: 'gala',
  near: 'near',
  aave: 'aave',
  sei: 'sei',
  tia: 'celestia',
  celestia: 'celestia',
  apt: 'aptos',
  aptos: 'aptos',
};

export const isValidSpotCrypto = (idOrSymbol: string, vol24h: number = 0, isCurated: boolean = false): boolean => {
  if (!idOrSymbol) return false;
  const clean = idOrSymbol.toLowerCase().trim();
  const base = clean.replace(/usdt$/, '');

  // 0. Curated coins or known major aliases are ALWAYS valid spot crypto
  if (COINS[clean] || COINS[base] || CANONICAL_ALIASES[clean] || CANONICAL_ALIASES[base]) {
    return true;
  }

  // 1. Explicitly reject all known non-spot, delisted, halted, or purged tokens
  if (NON_SPOT_OR_HALTED_SYMBOLS.has(clean) || NON_SPOT_OR_HALTED_SYMBOLS.has(base)) return false;

  // 2. Reject fiat & stablecoins (Set + any ticker ending with USD, e.g. USD1, RLUSD, USDe)
  if (FIAT_STABLECOIN_SYMBOLS.has(clean) || FIAT_STABLECOIN_SYMBOLS.has(base)) return false;
  if (/^(usd|eur|gbp|try|brl|rub|cad|aud)/i.test(base) || /(usd|eur)$/i.test(base)) {
    return false;
  }

  // 3. Reject leveraged tokens (UP, DOWN, BEAR, BULL)
  if (/(up|down|bear|bull)$/i.test(base)) return false;

  // 4. Reject tokenized equities (bStocks: SNDKB, CRCLB, MSTRB, etc. ending with 'b' except BNB & SHIB)
  if (/^[a-z0-9]+b$/i.test(base) && !['bnb', 'shib'].includes(base)) return false;

  // 5. Reject commodities, equity tokens, warrants, oil, metal synthetics
  if (/^(xau|xag|xaut|copper|oil|csop|skhyb|warrant|gold|silver|natgas|spcx|sqqq|tqqq|cohr|hype|anthropic|paxg|sats)/i.test(base)) return false;

  // 6. Reject futures multipliers and single/double digit pure numbers
  if (/^(1000|1000000|0g)\w+/i.test(base) || /^\d{1,2}$/.test(base)) return false;

  // 7. Reject abnormal symbol length or non-alphanumeric chars (allow hyphens for coin IDs up to 25 chars)
  if (!/^[a-z0-9-]+$/i.test(base) || base.length > 25 || base.length < 2) return false;

  // 8. Curated major coins are valid with non-negative volume
  if (isCurated && (COINS[clean] || COINS[base])) {
    return vol24h === undefined || vol24h === null || vol24h >= 0;
  }

  // 9. Strict Liquidity threshold: Non-curated dynamically discovered pairs MUST have real volume (>= $2,500,000)
  if (vol24h < 2_500_000) return false;

  return true;
};

export const isNonSpotToken = (idOrSymbol: string): boolean => {
  if (!idOrSymbol) return true;
  const clean = idOrSymbol.toLowerCase().trim();
  const base = clean.replace(/usdt$/, '');
  if (COINS[clean] || COINS[base] || CANONICAL_ALIASES[clean] || CANONICAL_ALIASES[base]) return false;
  if (NON_SPOT_OR_HALTED_SYMBOLS.has(clean) || NON_SPOT_OR_HALTED_SYMBOLS.has(base)) return true;
  if (FIAT_STABLECOIN_SYMBOLS.has(clean) || FIAT_STABLECOIN_SYMBOLS.has(base)) return true;
  return !isValidSpotCrypto(idOrSymbol, 5_000_000, true);
};

/**
 * Valida si un id o símbolo corresponde a un par spot activo y tradeable en Binance Spot.
 */
export const isTradeableBinanceSpot = (idOrSymbol: string): boolean => {
  if (!idOrSymbol) return false;
  const clean = idOrSymbol.toLowerCase().trim();
  const base = clean.replace(/usdt$/, '');

  // 1. Curated coins or known canonical aliases
  if (COINS[clean] || COINS[base] || CANONICAL_ALIASES[clean] || CANONICAL_ALIASES[base]) {
    return true;
  }

  // 2. Any dynamically resolved or catalogued coin in COINS
  const found = Object.values(COINS).find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.symbol.toLowerCase() === clean ||
      c.binanceSymbol.toLowerCase() === clean ||
      c.binanceSymbol.toLowerCase() === `${clean}usdt`
  );
  if (found) return true;

  // 3. Dynamic Binance Spot pairs: if not a non-spot token and meets valid spot criteria
  if (!isNonSpotToken(clean) && isValidSpotCrypto(clean, 0, true)) {
    return true;
  }

  return false;
};

/**
 * Whitelist oficial de Criptomonedas Spot de Alta Liquidez para Alertas de Señales de Mercado.
 * Excluye estrictamente acciones, tokens sintéticos y activos ilíquidos.
 */
export const TOP_SPOT_SIGNAL_COIN_IDS = new Set([
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'ripple',
  'cardano',
  'avalanche',
  'sui',
  'polkadot',
  'chainlink',
  'near',
  'render',
  'dogecoin',
  'pepe',
  'arbitrum',
  'optimism',
  'polygon',
  'aptos',
  'injective',
  'sei',
  'tia',
  'bittensor',
  'jupiter',
  'worldcoin',
  'floki',
  'shiba-inu',
  'uniswap',
]);

export const getDynamicCoinInfo = (idOrSymbol: string): CoinInfo => {
  if (!idOrSymbol) return COINS.solana;
  const clean = idOrSymbol.toLowerCase().trim();
  const upper = idOrSymbol.toUpperCase().trim();

  // 1. Direct key match in COINS
  if (COINS[clean]) return COINS[clean];

  // 2. Canonical major symbol mapping (e.g. bnb -> binancecoin, btc -> bitcoin)
  const canonicalId = CANONICAL_ALIASES[clean] || CANONICAL_ALIASES[clean.replace(/usdt$/, '')];
  if (canonicalId && COINS[canonicalId]) return COINS[canonicalId];

  // 3. Match by symbol, binanceSymbol, or name in COINS
  const bySymbol = Object.values(COINS).find(
    (c) =>
      c.symbol.toUpperCase() === upper ||
      c.binanceSymbol === upper + 'USDT' ||
      c.binanceSymbol === upper ||
      c.name.toUpperCase() === upper
  );
  if (bySymbol) return bySymbol;

  // 4. Filter out known invalid non-spot tokens ONLY after checking all curated & alias lists
  if (isNonSpotToken(clean)) {
    return COINS.solana;
  }

  // 5. Construct on-the-fly CoinInfo for any valid Binance pair
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
  if (isNonSpotToken(binanceSymbol)) {
    return generateBackupCandles(basePrice, limit, interval);
  }

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
    return generateBackupCandles(basePrice, limit, interval);
  }
}

/**
 * Fetch 24h ticker statistics from Binance Public API (Spot with Futures fallback)
 */
export async function fetchRealBinance24hStats(binanceSymbol: string) {
  try {
    let res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
    if (!res.ok) {
      res = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
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
 * Fetch all 24h ticker statistics in a SINGLE ultra-fast call (~150ms) exclusively from Binance Spot API.
 * Ingests only verified tradeable Spot pairs, filtering out derivatives, fiat, leveraged tokens,
 * and commodities with systematic algorithmic sanitization.
 */
export async function fetchAllCoins24hStats(): Promise<Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }>> {
  try {
    // Exclusively query Binance Spot endpoints (Never query fapi / Futures to avoid synthetic pollution)
    const spotRes = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr')
      .catch(() => fetch('https://api.binance.com/api/v3/ticker/24hr'));

    const spotData: Array<{ symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }> =
      spotRes && spotRes.ok ? await spotRes.json() : [];

    // Build curated lookup table by Binance Symbol
    const curatedByBinanceSym = new Map<string, CoinInfo>();
    Object.values(COINS).forEach((c) => {
      curatedByBinanceSym.set(c.binanceSymbol, c);
    });

    const CANONICAL_BASE_TO_ID: Record<string, string> = {
      BNB: 'binancecoin',
      BTC: 'bitcoin',
      ETH: 'ethereum',
      SOL: 'solana',
      ADA: 'cardano',
      XRP: 'ripple',
      AVAX: 'avalanche',
      DOT: 'polkadot',
      LINK: 'chainlink',
      NEAR: 'near',
      RENDER: 'render',
      RNDR: 'render',
      DOGE: 'dogecoin',
      PEPE: 'pepe',
      SHIB: 'shiba-inu',
      MATIC: 'polygon',
      POL: 'polygon',
      ARB: 'arbitrum',
      OP: 'optimism',
      SUI: 'sui',
      FET: 'fetch-ai',
      UNI: 'uniswap',
      AAVE: 'aave',
      INJ: 'injective',
      SEI: 'sei',
      TIA: 'tia',
      TAO: 'bittensor',
      JUP: 'jupiter',
      WLD: 'worldcoin',
      FLOKI: 'floki',
    };

    const AI_SYMBOLS = new Set(['FET', 'RENDER', 'RNDR', 'NEAR', 'AGIX', 'OCEAN', 'WLD', 'TAO', 'GRT', 'AR', 'IO', 'ATH', 'AI', 'JASMY']);
    const L2_SYMBOLS = new Set(['ARB', 'OP', 'MATIC', 'POL', 'STRK', 'MNT', 'METIS', 'ZK', 'MANTA', 'IMX']);
    const DEFI_SYMBOLS = new Set(['UNI', 'AAVE', 'CRV', 'SNX', 'COMP', 'LDO', 'PENDLE', 'JUP', 'RAY', 'RUNE', 'INJ', 'ENA']);
    const MEME_SYMBOLS = new Set(['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'BOME', 'MEME', 'TURBO', 'NEIRO', '1MBABYDOGE']);

    const result: Record<string, { price: number; change24h: number; high24h: number; low24h: number; vol24h: number; change7d: number; rsi: number; momentum: number }> = {};
    const seenSymbols = new Set<string>();

    const processItem = (item: { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }) => {
      if (!item.symbol.endsWith('USDT')) return;
      if (seenSymbols.has(item.symbol)) return;

      const baseSymbol = item.symbol.replace(/USDT$/, '');
      const price = parseFloat(item.lastPrice) || 0;
      const vol24h = parseFloat(item.quoteVolume) || 0;

      // Strictly REJECT if price is 0 or volume is 0 (delisted / dead pairs)
      if (price <= 0 || vol24h <= 0) return;

      const isCurated = curatedByBinanceSym.has(item.symbol) || Boolean(CANONICAL_BASE_TO_ID[baseSymbol]);

      // Systematic Rule-Based Sanitizer: rejects fiat, leveraged, commodity synthetics, warrants, ghost coins
      if (!isValidSpotCrypto(baseSymbol, vol24h, isCurated)) return;

      // Reject pegged fiat-stablecoins by price bounds ($0.985 - $1.015 with minimal daily movement)
      if (price >= 0.985 && price <= 1.015 && Math.abs(parseFloat(item.priceChangePercent) || 0) < 0.8) {
        if (!['ada', 'sui', 'matic', 'pol', 'xrp', 'fet', 'algo'].includes(baseSymbol.toLowerCase())) {
          return;
        }
      }

      seenSymbols.add(item.symbol);

      const change24h = parseFloat(item.priceChangePercent) || 0;
      const high24h = parseFloat(item.highPrice) || price * 1.03;
      const low24h = parseFloat(item.lowPrice) || price * 0.97;

      let coinInfo: CoinInfo;
      const canonicalId = CANONICAL_BASE_TO_ID[baseSymbol];

      if (canonicalId && COINS[canonicalId]) {
        coinInfo = COINS[canonicalId];
      } else if (isCurated && curatedByBinanceSym.has(item.symbol)) {
        coinInfo = curatedByBinanceSym.get(item.symbol)!;
      } else {
        const id = baseSymbol.toLowerCase();
        const decimals = price >= 1000 ? 2 : price >= 1 ? 2 : price >= 0.01 ? 4 : price >= 0.0001 ? 6 : 8;

        let category: 'TOP' | 'AI' | 'L2' | 'DEFI' | 'MEME' = 'TOP';
        if (AI_SYMBOLS.has(baseSymbol)) category = 'AI';
        else if (L2_SYMBOLS.has(baseSymbol)) category = 'L2';
        else if (DEFI_SYMBOLS.has(baseSymbol)) category = 'DEFI';
        else if (MEME_SYMBOLS.has(baseSymbol)) category = 'MEME';
        else if (vol24h >= 60_000_000) category = 'TOP';

        coinInfo = {
          id,
          name: baseSymbol,
          symbol: baseSymbol,
          binanceSymbol: item.symbol,
          category,
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

    // Ensure memory COINS is clean of ghost tokens
    Object.keys(COINS).forEach((key) => {
      if (NON_SPOT_OR_HALTED_SYMBOLS.has(key.toLowerCase()) || NON_SPOT_OR_HALTED_SYMBOLS.has(COINS[key].symbol.toLowerCase())) {
        delete COINS[key];
      }
    });

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
        const sanitized: Record<string, any> = {};
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          if (isValidSpotCrypto(id, data.vol24h, Boolean(COINS[id])) && data.price > 0 && data.vol24h > 100_000) {
            sanitized[id] = data;
          }
        });
        if (Object.keys(sanitized).length > 0) return sanitized;
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
  if (isNonSpotToken(binanceSymbol)) {
    return generateOrderBook(basePrice, limit);
  }

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

const INTERVAL_SECONDS_MAP: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '3d': 259200,
  '1w': 604800,
  '1M': 2592000,
};

export function generateBackupCandles(
  basePrice: number = 100,
  count: number = 80,
  interval: string = '1h'
): CandleData[] {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = INTERVAL_SECONDS_MAP[interval] || 3600;
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
