import React, { useState, useEffect } from 'react';
import { TokenItem } from '../types.ts';
import { safeFetchJson } from '../utils/api.ts';
import { announceToken } from '../utils/audio.ts';
import { ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface PublicDisplayBoardProps {
  onBack: () => void;
  centre?: string;
}

export const PublicDisplayBoard: React.FC<PublicDisplayBoardProps> = ({ onBack, centre }) => {
  const [servingTokens, setServingTokens] = useState<TokenItem[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [prevServingIds, setPrevServingIds] = useState<string[]>([]);
  const [activeCentre, setActiveCentre] = useState<string>(centre || 'Krishi Seva Kendra - Main Centre');

  const fetchLive = async () => {
    try {
      const url = activeCentre ? `/api/tokens/live-queue?centre=${encodeURIComponent(activeCentre)}` : '/api/tokens/live-queue';
      const res = await safeFetchJson<{
        currentlyServing?: TokenItem[];
        waitingQueue?: any[];
      }>(url);
      if (res.ok && res.data) {
        const newServing = res.data.currentlyServing || [];
        setWaitingQueue(res.data.waitingQueue || []);

        if (soundEnabled && prevServingIds.length > 0) {
          const newlyCalled = newServing.find(t => !prevServingIds.includes(t._id));
          if (newlyCalled) {
            announceToken(newlyCalled.tokenNumber, newlyCalled.counterNumber || 1, newlyCalled.farmerName);
          }
        }

        setPrevServingIds(newServing.map(t => t._id));
        setServingTokens(newServing);
      }
    } catch (err) {
      console.warn('Notice: Display queue sync pending:', err);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [soundEnabled, prevServingIds]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between select-none">
      {/* 1. TOP STATUS BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              KISAN QUEUE — {activeCentre}
            </h1>
            <p className="text-xs text-emerald-400 font-medium">Public Waiting Room Display Terminal • Real-Time Counter Sync</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`text-xs px-2.5 py-1 rounded border font-semibold flex items-center space-x-1.5 cursor-pointer ${
              soundEnabled ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio Chime ON' : 'Audio Muted'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer hidden sm:block"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="text-xl sm:text-2xl font-mono font-bold text-amber-300">
            {currentTime || '00:00:00'}
          </div>
        </div>
      </header>

      {/* 2. MAIN DISPLAY BODY */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* NOW SERVING SECTION */}
        <section className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-widest font-heading">
                NOW SERVING • अभी चालू
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/60">
              {servingTokens.length} Active Desks
            </span>
          </div>

          {servingTokens.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              All counters currently waiting for next farmer call.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servingTokens.map((tok, idx) => (
                <div
                  key={tok._id || tok.tokenNumber || `serving-${idx}`}
                  className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-5 flex items-center justify-between shadow-lg relative group hover:border-emerald-400 transition-all transform hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        tok.status === 'called'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      }`}>
                        {tok.status === 'called' ? 'Calling to Counter' : 'Serving at Counter'}
                      </span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight font-heading">
                      {tok.tokenNumber}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 font-semibold mt-1">
                      {tok.farmerName}
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-0.5 font-medium flex items-center space-x-1.5">
                      <span>{tok.serviceName}</span>
                      {tok.slotString && (
                        <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-mono">
                          {tok.slotString}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Counter</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                      0{tok.counterNumber || 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* WAITING QUEUE SECTION */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest font-heading">
                UPCOMING IN LINE • प्रतीक्षारत किसान
              </span>
            </div>
            <span className="text-xs text-amber-300 font-mono bg-amber-950/60 border border-amber-800/40 px-2.5 py-0.5 rounded-full">
              {waitingQueue.length} In Line
            </span>
          </div>

          {waitingQueue.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Waiting line is clear. No pending tokens.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {waitingQueue.slice(0, 9).map((tok, idx) => (
                <div
                  key={tok._id || tok.tokenNumber || `waiting-${idx}`}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl font-bold font-mono text-slate-100">
                      {tok.tokenNumber}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-300">
                        {tok.farmerName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                        <span>{tok.serviceName}</span>
                        {tok.slotString && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            • {tok.slotString}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 bg-amber-950/80 text-amber-300 rounded-md border border-amber-800/30">
                    Pos #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 3. BOTTOM NOTIFICATION BAR */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 text-center text-xs text-slate-400">
        Please present your digital token slip or SMS when your token number is announced at the counter.
      </footer>
    </div>
  );
};
