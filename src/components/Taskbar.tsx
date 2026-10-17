import React, { useState } from 'react';
import { SlidersHorizontal, Search, X, Sun, Moon } from 'lucide-react';
import { TranslationStrings } from '../types';

interface TaskbarProps {
  brandTitle: string;
  t: TranslationStrings;
  theme: 'light' | 'dark';
  isOpenStatus?: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  brandTitle,
  t,
  theme,
  isOpenStatus = true,
  onToggleTheme,
  onOpenSettings,
  searchQuery,
  onSearchChange
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-[#7C0A11] via-[#8E101A] to-[#9E121E] text-white shadow-lg shadow-[#9E121E]/20 z-50 border-b-[3px] border-[#DCAE5B] flex items-center px-4 sm:px-6 justify-between select-none">
      {/* Search Input Bar (when expanded) */}
      {showSearch ? (
        <div className="w-full flex items-center gap-2 animate-fadeIn">
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-white/15 text-white placeholder-white/70 px-4 py-2 pr-9 rounded-full text-sm outline-none border border-white/20 focus:border-[#DCAE5B] focus:bg-white/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setShowSearch(false);
              onSearchChange('');
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            title={t.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-3 select-none"
            title={brandTitle}
          >
            <div className="w-9 h-9 rounded-full bg-[#DCAE5B] text-[#7C0A11] flex items-center justify-center font-black text-xl shadow-md border-2 border-white/20 group-hover:scale-105 transition-transform">
              🍳
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-normal leading-tight text-white drop-shadow-sm">
                {brandTitle}
              </span>
              <span className="text-[11px] font-semibold -mt-0.5 tracking-wide flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOpenStatus
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-rose-400'
                  }`}
                ></span>
                <span className={isOpenStatus ? 'text-[#DCAE5B]' : 'text-rose-200'}>
                  {isOpenStatus ? t.statusOpen : t.statusClosed}
                </span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(true)}
              className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-transform text-white"
              aria-label="Search"
              title={t.searchPlaceholder}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Quick Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-transform text-[#DCAE5B]"
              aria-label="Theme toggle"
              title={theme === 'dark' ? t.lightTheme : t.darkTheme}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Modern Settings Button (Slider Icon like Omed's design) */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white group"
              aria-label="Settings"
              title={t.modalTitle}
            >
              <SlidersHorizontal className="w-6 h-6 transition-transform duration-300 group-hover:rotate-45 group-hover:text-[#DCAE5B]" />
            </button>
          </div>
        </>
      )}
    </header>
  );
};
