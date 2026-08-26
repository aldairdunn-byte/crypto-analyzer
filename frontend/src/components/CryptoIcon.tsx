import React, { useState, useEffect } from 'react';

interface CryptoIconProps {
  symbol: string;
  coinId?: string;
  size?: number;
  className?: string;
}

// Brand color accents for major cryptocurrencies
const COIN_BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  BTC: { bg: '#F7931A', text: '#FFFFFF' },
  ETH: { bg: '#627EEA', text: '#FFFFFF' },
  SOL: { bg: '#141414', text: '#00FFA3' },
  BNB: { bg: '#F0B90B', text: '#000000' },
  XRP: { bg: '#23292F', text: '#FFFFFF' },
  ADA: { bg: '#0033AD', text: '#FFFFFF' },
  AVAX: { bg: '#E84142', text: '#FFFFFF' },
  SUI: { bg: '#2A82E4', text: '#FFFFFF' },
  DOT: { bg: '#E6007A', text: '#FFFFFF' },
  LINK: { bg: '#375BD2', text: '#FFFFFF' },
  POL: { bg: '#8247E5', text: '#FFFFFF' },
  TON: { bg: '#0098EA', text: '#FFFFFF' },
  TRX: { bg: '#FF0013', text: '#FFFFFF' },
  APT: { bg: '#2ED8A7', text: '#000000' },
  TIA: { bg: '#7B2BF9', text: '#FFFFFF' },
  ATOM: { bg: '#2E3148', text: '#FFFFFF' },
  SEI: { bg: '#9B1D20', text: '#FFFFFF' },
  ARB: { bg: '#28A0F0', text: '#FFFFFF' },
  OP: { bg: '#FF0420', text: '#FFFFFF' },
  STX: { bg: '#5546FF', text: '#FFFFFF' },
  ZRO: { bg: '#1A1A1A', text: '#FFFFFF' },
  ENA: { bg: '#1E1E1E', text: '#FFFFFF' },
  TAO: { bg: '#171717', text: '#FFFFFF' },
  RENDER: { bg: '#E11D48', text: '#FFFFFF' },
  FET: { bg: '#1E293B', text: '#38BDF8' },
  NEAR: { bg: '#000000', text: '#FFFFFF' },
  INJ: { bg: '#00D4B5', text: '#000000' },
  WLD: { bg: '#000000', text: '#FFFFFF' },
  GRT: { bg: '#6749D7', text: '#FFFFFF' },
  AKT: { bg: '#ED3524', text: '#FFFFFF' },
  UNI: { bg: '#FF007A', text: '#FFFFFF' },
  AAVE: { bg: '#B6509E', text: '#FFFFFF' },
  JUP: { bg: '#24D086', text: '#000000' },
  ONDO: { bg: '#1B365D', text: '#FFFFFF' },
  PENDLE: { bg: '#26293B', text: '#00FFA3' },
  KAS: { bg: '#70C7BA', text: '#000000' },
  HBAR: { bg: '#222222', text: '#FFFFFF' },
  FTM: { bg: '#1969FF', text: '#FFFFFF' },
  DOGE: { bg: '#C2A633', text: '#FFFFFF' },
  SHIB: { bg: '#FFA409', text: '#000000' },
  PEPE: { bg: '#48A048', text: '#FFFFFF' },
  WIF: { bg: '#795548', text: '#FFFFFF' },
  BONK: { bg: '#F59E0B', text: '#000000' },
  FLOKI: { bg: '#EE8800', text: '#FFFFFF' },
  POPCAT: { bg: '#7C3AED', text: '#FFFFFF' },
  PENGU: { bg: '#3B82F6', text: '#FFFFFF' },
  MOVE: { bg: '#E11D48', text: '#FFFFFF' },
  SAGA: { bg: '#000000', text: '#FFFFFF' },
  ORDI: { bg: '#1E293B', text: '#FFFFFF' },
  PAXG: { bg: '#D4AF37', text: '#000000' },
  GALA: { bg: '#000000', text: '#FFFFFF' },
  USDT: { bg: '#26A17B', text: '#FFFFFF' },
  USDC: { bg: '#2775CA', text: '#FFFFFF' },
};

/**
 * Normaliza cualquier identificador o símbolo a su clave estándar
 */
function normalizeSymbol(symbol: string): string {
  const clean = symbol.trim().toLowerCase().replace(/usdt$/, '').replace(/usd$/, '');
  const map: Record<string, string> = {
    bitcoin: 'btc',
    ethereum: 'eth',
    solana: 'sol',
    binancecoin: 'bnb',
    ripple: 'xrp',
    cardano: 'ada',
    avalanche: 'avax',
    dogecoin: 'doge',
    polkadot: 'dot',
    chainlink: 'link',
    polygon: 'pol',
    matic: 'pol',
    celestia: 'tia',
    aptos: 'apt',
    cosmos: 'atom',
    'fetch-ai': 'fet',
    render: 'render',
    'render-token': 'render',
    nearprotocol: 'near',
    'near-protocol': 'near',
    bittensor: 'tao',
    injective: 'inj',
    worldcoin: 'wld',
    thegraph: 'grt',
    'the-graph': 'grt',
    akash: 'akt',
    'akash-network': 'akt',
    uniswap: 'uni',
    jupiter: 'jup',
    fantom: 'ftm',
    'shiba-inu': 'shib',
    dogwifhat: 'wif',
    tether: 'usdt',
    stacks: 'stx',
    layerzero: 'zro',
    ethena: 'ena',
    saga: 'saga',
    ondo: 'ondo',
    kaspa: 'kas',
    hedera: 'hbar',
    pendle: 'pendle',
    pyth: 'pyth',
    movement: 'move',
    'pudgy-penguins': 'pengu',
    virtual: 'virtual',
    aixbt: 'aixbt',
    ordinals: 'ordi',
    'pax-gold': 'paxg',
    starknet: 'strk',
    manta: 'manta',
    algorand: 'algo',
    'internet-computer': 'icp',
    vechain: 'vet',
    filecoin: 'fil',
  };
  return map[clean] || clean;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, size = 28, className = '' }) => {
  const [cdnIndex, setCdnIndex] = useState(0);
  const normalized = normalizeSymbol(symbol);
  const upper = normalized.toUpperCase();
  const brand = COIN_BRAND_COLORS[upper] || { bg: '#1E293B', text: '#F8FAFC' };

  useEffect(() => {
    setCdnIndex(0);
  }, [symbol]);

  // Multi-CDN Resolution Priority:
  // 1. OKX Official Crypto CDN (Near 100% token coverage including STX, ZRO, ENA, SUI, TAO, MOVE, PENGU)
  // 2. CoinCap Retina Assets
  // 3. SpotHQ Cryptocurrency Icons Repo
  // 4. CryptoIcons Public API
  const cdnSources = [
    `https://static.okx.com/cdn/oksupport/asset/currency/icon/${normalized}.png`,
    `https://assets.coincap.io/assets/icons/${normalized}@2x.png`,
    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${normalized}.png`,
    `https://cryptoicons.org/api/icon/${normalized}/200`,
  ];

  const currentSrc = cdnSources[cdnIndex];

  if (currentSrc && cdnIndex < cdnSources.length) {
    return (
      <img
        src={currentSrc}
        alt={symbol}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setCdnIndex((prev) => prev + 1)}
        className={`rounded-full shrink-0 object-contain shadow-sm ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
        }}
      />
    );
  }

  // Fallback: Ultra-Clean Vector Badge with High-Contrast Typography
  return (
    <div
      className={`rounded-full flex items-center justify-center font-mono font-black shrink-0 select-none shadow-sm ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        backgroundColor: brand.bg,
        color: brand.text,
        fontSize: size >= 32 ? '11px' : size >= 24 ? '9.5px' : '8px',
        lineHeight: 1,
      }}
    >
      {upper.slice(0, 3)}
    </div>
  );
};
