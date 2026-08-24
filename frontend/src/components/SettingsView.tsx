import { useState } from 'react';
import { Send, CheckCircle2, Sliders, Database, RotateCcw, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { sendTelegramTestMessage } from '../lib/telegram';

interface SettingsViewProps {
  onResetDemoBalance: () => void;
}

export const SettingsView = ({ onResetDemoBalance }: SettingsViewProps) => {
  const [telegramStatus] = useState<string>('CONECTADO');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [rsiOversold, setRsiOversold] = useState<number>(38);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(2.2);

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    const res = await sendTelegramTestMessage();
    setIsSendingTest(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: '¡Alerta de prueba enviada con éxito a Telegram (@CryptoDunnAlerts_bot)!',
      });
    } else {
      setTestResult({
        success: false,
        message: `Error al enviar a Telegram: ${res.error || 'Verifica la conexión'}`,
      });
    }

    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <div className="flex-1 bg-[#08090C] p-3.5 sm:p-5 lg:p-6 overflow-y-auto select-none space-y-4 sm:space-y-6 content-bottom-pad">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#F59E0B]" />
          <span>Centro de Control & Configuración</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Ajustes de alertas móviles Telegram, parámetros del motor cuantitativo y gestión de base de datos Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Telegram Bot Integration Card */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Notificaciones Telegram (@CryptoDunnAlerts_bot)</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">Chat ID: 1996733499 · Despacho en tiempo real</div>
            </div>
            <span className="bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
              <span>{telegramStatus}</span>
            </span>
          </div>

          <div className="bg-[#08090C] p-3 rounded-xl border border-white/5 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Alertas de Señales Técnicas:</span>
              <span className="text-white font-bold">Activadas (HTML Profesional)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Alertas de Bots Grid & DCA:</span>
              <span className="text-white font-bold">Instantáneas (Creación & Ejecución)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Notificación de Órdenes Grid:</span>
              <span className="text-[#0ECB81] font-bold">Fills con PnL en tiempo real</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Trades Spot Manuales:</span>
              <span className="text-[#F59E0B] font-bold">Confirmación inmediata</span>
            </div>
          </div>

          <button
            onClick={handleSendTestAlert}
            disabled={isSendingTest}
            className="w-full bg-white/5 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-extrabold py-2.5 rounded-xl border border-blue-500/30 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm disabled:opacity-50"
          >
            {isSendingTest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Contactando API de Telegram...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Alerta de Prueba a Telegram</span>
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn shadow-md border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-[#0ECB81]'
                  : 'bg-rose-500/10 border-rose-500/30 text-[#F6465D]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0ECB81]" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F6465D]" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* 2. Quantitative Engine Parameters */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4">
          <div className="text-sm font-extrabold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#F59E0B]" />
            <span>Sensibilidad del Motor Cuantitativo</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400 font-bold">Umbral Sobreventa RSI (Señal de Compra)</span>
                <span className="text-white font-mono font-black tabular-nums">RSI ≤ {rsiOversold}</span>
              </div>
              <input
                type="range"
                min={20}
                max={45}
                value={rsiOversold}
                onChange={(e) => setRsiOversold(Number(e.target.value))}
                className="w-full accent-[#0ECB81] bg-[#151922] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400 font-bold">Umbral Sobrecompra RSI (Señal de Venta)</span>
                <span className="text-white font-mono font-black tabular-nums">RSI ≥ {rsiOverbought}</span>
              </div>
              <input
                type="range"
                min={60}
                max={85}
                value={rsiOverbought}
                onChange={(e) => setRsiOverbought(Number(e.target.value))}
                className="w-full accent-[#F6465D] bg-[#151922] h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400 font-bold">Multiplicador de Bandas ATR (Amplitud del Grid)</span>
                <span className="text-white font-mono font-black tabular-nums">{atrMultiplier}x ATR</span>
              </div>
              <input
                type="range"
                min={1.2}
                max={3.5}
                step={0.1}
                value={atrMultiplier}
                onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                className="w-full accent-[#F59E0B] bg-[#151922] h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Cloud Database & Reset Demo Balance */}
        <div className="glass-card rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0ECB81]" />
                <span>Base de Datos Supabase Cloud (PostgreSQL)</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">Persistencia inmutable de 7 tablas en la nube</div>
            </div>
            <span className="bg-emerald-500/15 text-[#0ECB81] border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-black flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ONLINE & PROTEGIDO</span>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5">
              <div className="text-slate-400 text-[10px] font-sans">Tabla `bots`</div>
              <div className="text-white font-bold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                <span>Sincronizada</span>
              </div>
            </div>
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5">
              <div className="text-slate-400 text-[10px] font-sans">Tabla `bot_trades`</div>
              <div className="text-white font-bold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                <span>Sincronizada</span>
              </div>
            </div>
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5">
              <div className="text-slate-400 text-[10px] font-sans">Tabla `signals`</div>
              <div className="text-white font-bold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                <span>Sincronizada</span>
              </div>
            </div>
            <div className="bg-[#08090C] p-3 rounded-xl border border-white/5">
              <div className="text-slate-400 text-[10px] font-sans">Tabla `portfolio`</div>
              <div className="text-white font-bold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                <span>Sincronizada</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">¿Deseas reiniciar tu historial de práctica y saldo demo?</span>
            <button
              onClick={onResetDemoBalance}
              className="bg-white/5 hover:bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Saldo Demo a $1,000.00 USDT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
