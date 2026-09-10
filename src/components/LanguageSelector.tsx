import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext.tsx';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'footer' | 'compact';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'navbar' }) => {
  const { language, setLanguage, languages, currentLanguageInfo, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        id="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700 hover:border-emerald-500/40 transition-all text-xs font-medium cursor-pointer shadow-xs"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t('common.language', 'Language')}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-bold text-emerald-300 font-sans text-[11px] px-1 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/30">
          {currentLanguageInfo.badge}
        </span>
        <span className="hidden sm:inline-block font-semibold">
          {currentLanguageInfo.nativeName}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span>{t('common.language', 'Select Language')}</span>
            <Globe className="w-3 h-3 text-emerald-400" />
          </div>

          <div className="max-h-64 overflow-y-auto py-1 space-y-0.5">
            {languages.map((item) => (
              <button
                key={item.code}
                id={`lang-option-${item.code}`}
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors cursor-pointer ${
                  language === item.code
                    ? 'text-emerald-300 font-bold bg-emerald-950/40 border-l-2 border-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                    {item.badge}
                  </span>
                  <span>{item.nativeName}</span>
                </div>
                {language === item.code && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
