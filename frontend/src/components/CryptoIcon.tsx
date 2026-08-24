import React from 'react';

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, size = 28, className = '' }) => {
  const sym = symbol.toUpperCase();

  switch (sym) {
    case 'BTC':
    case 'BITCOIN':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#FFF"
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.922-.221-1.387-.325l.696-2.788-1.727-.43-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.827 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.383-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.14.986-5.31.695l.947-3.799c1.17.292 4.925.872 4.363 3.104zm.536-5.578c-.487 1.953-3.495.96-4.47.717l.86-3.45c.974.243 4.118.697 3.61 2.733z"
          />
        </svg>
      );

    case 'ETH':
    case 'ETHEREUM':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFF" fillRule="evenodd">
            <path fillOpacity=".6" d="M16.498 4v8.87l7.497 3.35z" />
            <path d="M16.498 4L9 16.22l7.498-3.35z" />
            <path fillOpacity=".6" d="M16.498 21.968v6.027L24 17.616z" />
            <path d="M16.498 27.995v-6.028L9 17.616z" />
            <path fillOpacity=".2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
            <path fillOpacity=".6" d="M9 16.22l7.498 4.353v-7.701z" />
          </g>
        </svg>
      );

    case 'SOL':
    case 'SOLANA':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#141414" />
          <defs>
            <linearGradient id={`sol-grad-${size}`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#sol-grad-${size})`}
            d="M8.5 21.8c.2-.2.5-.3.8-.3h12.4c.5 0 .9.4 1.1.8.2.4.1.9-.2 1.2l-1.9 1.9c-.2.2-.5.3-.8.3H7.5c-.5 0-.9-.4-1.1-.8-.2-.4-.1-.9.2-1.2l1.9-1.9zm0-11.6c.2-.2.5-.3.8-.3h12.4c.5 0 .9.4 1.1.8.2.4.1.9-.2 1.2l-1.9 1.9c-.2.2-.5.3-.8.3H7.5c-.5 0-.9-.4-1.1-.8-.2-.4-.1-.9.2-1.2l1.9-1.9zm15 5.8c-.2-.2-.5-.3-.8-.3H10.3c-.5 0-.9.4-1.1.8-.2.4-.1.9.2 1.2l1.9 1.9c.2.2.5.3.8.3h12.4c.5 0 .9-.4 1.1-.8.2-.4.1-.9-.2-1.2l-1.9-1.9z"
          />
        </svg>
      );

    case 'BNB':
    case 'BINANCECOIN':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#F0B90B" />
          <path
            fill="#FFF"
            d="M16 6.5l3.2 3.2-5.7 5.7 2.5 2.5 5.7-5.7 3.2 3.2L16 24.3l-8.9-8.9L16 6.5zm-5.7 8.9L8.1 13.2l2.2-2.2 2.2 2.2-2.2 2.2zm11.4 0l-2.2-2.2 2.2-2.2 2.2 2.2-2.2 2.2zm-5.7 2.2l2.2-2.2 2.2 2.2-2.2 2.2-2.2-2.2z"
          />
        </svg>
      );

    case 'XRP':
    case 'RIPPLE':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#23292F" />
          <path
            fill="#FFF"
            d="M23.6 8.5h2.2l-6.1 6.1c-2 2-5.2 2-7.2 0L6.4 8.5h2.2l4.8 4.8c1.1 1.1 3 1.1 4.1 0l6.1-4.8zm-15.2 15h-2.2l6.1-6.1c2-2 5.2-2 7.2 0l6.1 6.1h-2.2l-4.8-4.8c-1.1-1.1-3-1.1-4.1 0l-6.1 4.8z"
          />
        </svg>
      );

    case 'ADA':
    case 'CARDANO':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#0033AD" />
          <circle cx="16" cy="16" r="5.5" fill="#FFF" />
          <circle cx="16" cy="7" r="1.5" fill="#FFF" />
          <circle cx="16" cy="25" r="1.5" fill="#FFF" />
          <circle cx="7" cy="16" r="1.5" fill="#FFF" />
          <circle cx="25" cy="16" r="1.5" fill="#FFF" />
          <circle cx="9.5" cy="9.5" r="1.2" fill="#FFF" />
          <circle cx="22.5" cy="22.5" r="1.2" fill="#FFF" />
          <circle cx="22.5" cy="9.5" r="1.2" fill="#FFF" />
          <circle cx="9.5" cy="22.5" r="1.2" fill="#FFF" />
        </svg>
      );

    case 'AVAX':
    case 'AVALANCHE':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#E84142" />
          <path
            fill="#FFF"
            d="M17.8 7.6c-.8-1.4-2.8-1.4-3.6 0l-7.7 13.4c-.8 1.4.2 3.1 1.8 3.1h4.2c.8 0 1.5-.4 1.9-1.1l3.5-6.1 3.5 6.1c.4.7 1.1 1.1 1.9 1.1h4.2c1.6 0 2.6-1.7 1.8-3.1L17.8 7.6zm-1.8 4.2l5.1 8.9h-10.2l5.1-8.9z"
          />
        </svg>
      );

    case 'SUI':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#2A82E4" />
          <path
            fill="#FFF"
            d="M16 6c-3.5 4.8-6.5 9.2-6.5 13.2 0 3.6 2.9 6.8 6.5 6.8s6.5-3.2 6.5-6.8C22.5 15.2 19.5 10.8 16 6zm0 17c-2 0-3.8-1.7-3.8-3.8 0-2.3 2-5.4 3.8-8 1.8 2.6 3.8 5.7 3.8 8 0 2.1-1.8 3.8-3.8 3.8z"
          />
        </svg>
      );

    case 'FET':
    case 'FETCH-AI':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#1C1F2E" />
          <circle cx="16" cy="16" r="15" fill="none" stroke="#25C9D0" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="3.5" fill="#25C9D0" />
          <circle cx="10" cy="11" r="2" fill="#25C9D0" />
          <circle cx="22" cy="11" r="2" fill="#25C9D0" />
          <circle cx="10" cy="21" r="2" fill="#25C9D0" />
          <circle cx="22" cy="21" r="2" fill="#25C9D0" />
          <line x1="16" y1="16" x2="10" y2="11" stroke="#25C9D0" strokeWidth="1.2" />
          <line x1="16" y1="16" x2="22" y2="11" stroke="#25C9D0" strokeWidth="1.2" />
          <line x1="16" y1="16" x2="10" y2="21" stroke="#25C9D0" strokeWidth="1.2" />
          <line x1="16" y1="16" x2="22" y2="21" stroke="#25C9D0" strokeWidth="1.2" />
        </svg>
      );

    case 'RENDER':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <circle cx="16" cy="16" r="15" fill="none" stroke="#E51B24" strokeWidth="1.5" />
          <path
            fill="#E51B24"
            d="M16 8c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm0 3c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5z"
          />
          <circle cx="16" cy="16" r="2" fill="#FFF" />
        </svg>
      );

    case 'NEAR':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <circle cx="16" cy="16" r="15" fill="none" stroke="#00C08B" strokeWidth="1.5" />
          <path
            fill="#FFF"
            d="M21.5 8.5L16.2 16l4.8 7.5h-3.2l-3.6-5.8-2.2 2.2v3.6H9.5V8.5h2.5v7.2l5.4-7.2h4.1z"
          />
        </svg>
      );

    case 'TAO':
    case 'BITTENSOR':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#141414" />
          <circle cx="16" cy="16" r="15" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
          <path
            fill="#FFF"
            d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm-1 3.5h2v9h-2v-9zm-4.5 3h11v2h-11v-2z"
          />
        </svg>
      );

    case 'DOGE':
    case 'DOGECOIN':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#C2A633" />
          <path
            fill="#FFF"
            d="M12 9h4.8c3.8 0 6.7 2.8 6.7 7s-2.9 7-6.7 7H12V9zm3.5 11.2h1.3c2 0 3.4-1.6 3.4-4.2s-1.4-4.2-3.4-4.2h-1.3v8.4zm-5.5-4.7h6.5v1.8H10v-1.8z"
          />
        </svg>
      );

    case 'SHIB':
    case 'SHIBA-INU':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#FFA409" />
          <path
            fill="#FFF"
            d="M21.5 10.2l-2.7 1.8c-.8-.4-1.8-.7-2.8-.7s-2 .3-2.8.7l-2.7-1.8-1 4.5c-.7 1.2-1 2.5-1 3.9 0 4.1 3.4 7.4 7.5 7.4s7.5-3.3 7.5-7.4c0-1.4-.4-2.7-1-3.9l-1-4.5zm-5.5 12.6c-2.4 0-4.4-1.5-4.9-3.6h9.8c-.5 2.1-2.5 3.6-4.9 3.6z"
          />
        </svg>
      );

    case 'PEPE':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#3D9944" />
          <circle cx="12" cy="13" r="3.5" fill="#FFF" />
          <circle cx="20" cy="13" r="3.5" fill="#FFF" />
          <circle cx="12" cy="13" r="1.5" fill="#000" />
          <circle cx="20" cy="13" r="1.5" fill="#000" />
          <path
            fill="none"
            stroke="#FFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M10 20c2 2 10 2 12 0"
          />
        </svg>
      );

    case 'GALA':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#131722" />
          <circle cx="16" cy="16" r="14.5" fill="none" stroke="#00FFA3" strokeWidth="1.5" />
          <path fill="#00FFA3" d="M16 8l7 12H9l7-12z" />
        </svg>
      );

    case 'USDT':
    case 'TETHER':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#FFF"
            d="M17.9 14.8v-2.2h5.5V9.4H8.6v3.2h5.5v2.2c-4.9.2-8.6 1.2-8.6 2.4s3.7 2.2 8.6 2.4v6.8h3.8v-6.8c4.9-.2 8.6-1.2 8.6-2.4s-3.7-2.2-8.6-2.4zm0 3.6c-3.7-.2-6.5-.8-6.5-1.5s2.8-1.3 6.5-1.5v3zm3.8-1.5c0 .7-2.8 1.3-6.5 1.5v-3c3.7.2 6.5.8 6.5 1.5z"
          />
        </svg>
      );

    case 'USDC':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            fill="#FFF"
            d="M16 7.5c-4.7 0-8.5 3.8-8.5 8.5s3.8 8.5 8.5 8.5 8.5-3.8 8.5-8.5-3.8-8.5-8.5-8.5zm0 15c-3.6 0-6.5-2.9-6.5-6.5S12.4 9.5 16 9.5s6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5zm.9-10.4h-2.1v1.1c-.8.1-1.6.4-2.1.9l.8 1.2c.4-.3.9-.6 1.5-.7v1.8c-.9.3-2.1.8-2.1 2.2 0 1.2.9 2 2.1 2.2v1.2h2.1v-1.1c.9-.1 1.7-.5 2.3-1.1l-.8-1.2c-.5.4-1.1.7-1.7.8v-1.9c1-.3 2.1-.8 2.1-2.2 0-1.2-.9-2-2.1-2.2v-1.2zm-2.1 3.5c-.4 0-.7-.2-.7-.6s.3-.6.7-.8v1.4zm2.1 2.9c.4 0 .7.2.7.6s-.3.6-.7.8v-1.4z"
          />
        </svg>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-gradient-to-br from-amber-500/20 to-[#F59E0B]/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold font-mono text-[#F59E0B] uppercase ${className}`}
        >
          {sym.slice(0, 3)}
        </div>
      );
  }
};
