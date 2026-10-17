import React from 'react';
import { TranslationStrings, CategoryState } from '../types';

interface CategoriesBarProps {
  t: TranslationStrings;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  categoriesState: CategoryState;
  categoryCounts: Record<string, number>;
}

export const CategoriesBar: React.FC<CategoriesBarProps> = ({
  t,
  activeCategory,
  onSelectCategory,
  categoriesState,
  categoryCounts
}) => {
  const categoriesList = [
    { key: 'all', label: t.categories.all, icon: '✨' },
    { key: 'germ', label: t.categories.germ, icon: '🔥' },
    { key: 'sar', label: t.categories.sar, icon: '❄️' },
    { key: 'shirin', label: t.categories.shirin, icon: '🍯' },
    { key: 'vexwarin', label: t.categories.vexwarin, icon: '☕' },
    { key: 'wejbe', label: t.categories.wejbe, icon: '🍽️' },
    { key: 'ewaza', label: t.categories.ewaza, icon: '🧈' }
  ];

  const visibleCategories = categoriesList.filter(
    (c) => c.key === 'all' || categoriesState[c.key] !== false
  );

  return (
    <nav className="fixed top-[70px] left-0 right-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border-accent)] shadow-sm px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
      {visibleCategories.map((cat) => {
        const isActive = activeCategory === cat.key;
        const count = categoryCounts[cat.key] || 0;

        return (
          <button
            key={cat.key}
            onClick={() => onSelectCategory(cat.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 select-none cursor-pointer ${
              isActive
                ? 'bg-[#9E121E] text-white shadow-md shadow-[#9E121E]/25 scale-102 border border-[#9E121E]'
                : 'bg-[var(--tab-bg)] text-[#9E121E] dark:text-[#E6BC73] border border-[var(--tab-border)] hover:bg-[#9E121E]/10'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            {count > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-black/5 dark:bg-white/10 text-current'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
