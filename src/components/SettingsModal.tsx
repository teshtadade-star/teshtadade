import React from 'react';
import { TranslationStrings, Language } from '../types';
import { X, Globe, Moon, Sun, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationStrings;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  onSelectTheme: (theme: 'light' | 'dark') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  t,
  currentLang,
  onSelectLang,
  theme,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A0304]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--card-bg)] border-2 border-[var(--border-accent)] w-full max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl my-auto animate-scaleUp text-[var(--text-dark)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[var(--border-accent)]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#9E121E] dark:text-[#E6BC73]" />
            <h3 className="text-xl font-black">{t.modalTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-light)] hover:text-[var(--text-dark)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Language Selection */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-light)] mb-2.5">
              <Globe className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
              <span>{t.langTitle}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'badini', label: 'بادینی' },
                { key: 'sorani', label: 'سۆرانی' },
                { key: 'arabic', label: 'عربي' },
                { key: 'english', label: 'English' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => onSelectLang(item.key as Language)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-sm transition-all border ${
                    currentLang === item.key
                      ? 'bg-[#9E121E] text-white border-[#9E121E] shadow-md shadow-[#9E121E]/20'
                      : 'bg-[var(--tab-bg)] text-[var(--text-dark)] border-[var(--border-accent)] hover:border-[#9E121E]/30'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-light)] mb-2.5">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[#E6BC73]" />
              ) : (
                <Sun className="w-4 h-4 text-[#9E121E]" />
              )}
              <span>{t.themeTitle}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectTheme('light')}
                className={`py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                  theme === 'light'
                    ? 'bg-[#9E121E] text-white border-[#9E121E] shadow-md shadow-[#9E121E]/20'
                    : 'bg-[var(--tab-bg)] text-[var(--text-dark)] border-[var(--border-accent)]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t.lightTheme}</span>
              </button>
              <button
                onClick={() => onSelectTheme('dark')}
                className={`py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                  theme === 'dark'
                    ? 'bg-[#9E121E] text-white border-[#9E121E] shadow-md shadow-[#9E121E]/20'
                    : 'bg-[var(--tab-bg)] text-[var(--text-dark)] border-[var(--border-accent)]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t.darkTheme}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Developer Credit Section */}
        <div className="mt-5 pt-4 border-t-2 border-dashed border-[var(--border-accent)] text-center text-xs text-[var(--text-light)] select-none">
          <div>
            <span>{t.developerTitle}: </span>
            <a
              href="tel:07507100238"
              className="font-extrabold text-[#9E121E] dark:text-[#E6BC73] underline hover:opacity-80"
            >
              {t.developerName}
            </a>
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span>تەلەفۆن:</span>
            <a
              href="tel:07507100238"
              dir="ltr"
              className="font-bold text-[#9E121E] dark:text-[#E6BC73] hover:underline"
            >
              {t.developerPhone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
