import React, { useRef } from 'react';
import { Dish, TranslationStrings } from '../types';
import { Sparkles, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { categoryFallbacks } from '../data/dishes';

interface FeaturedSliderProps {
  dishes: Dish[];
  t: TranslationStrings;
  onSelectDish: (dish: Dish) => void;
}

export const FeaturedSlider: React.FC<FeaturedSliderProps> = ({
  dishes,
  t,
  onSelectDish
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show pinned dishes and popular dishes in slider
  const featured = dishes.filter((d) => (d.isPinned || d.isPopular) && d.available !== false);

  if (featured.length === 0) return null;

  const handleScroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  return (
    <section className="mb-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#DCAE5B]/20 text-[#DCAE5B] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="font-black text-base sm:text-lg text-[var(--text-dark)]">
            {t.featuredDishes}
          </h2>
        </div>

        {/* Carousel Arrow buttons */}
        {featured.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-full bg-[var(--tab-bg)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--text-dark)] hover:bg-[#9E121E] hover:text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-full bg-[var(--tab-bg)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--text-dark)] hover:bg-[#9E121E] hover:text-white transition-colors"
              aria-label="Next"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2 px-1"
      >
        {featured.map((dish) => {
          const imgSrc = dish.img || categoryFallbacks[dish.cat] || categoryFallbacks['germ'];

          return (
            <div
              key={dish.id}
              onClick={() => onSelectDish(dish)}
              className="flex-shrink-0 w-[260px] sm:w-[300px] snap-start bg-[var(--card-bg)] border border-[var(--border-accent)] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group transform hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#F5EAEB] to-[#EAD5D7] dark:from-[#250E10] dark:to-[#160405]">
                <img
                  src={imgSrc}
                  alt={dish.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = categoryFallbacks[dish.cat] || categoryFallbacks['germ'];
                  }}
                />

                {/* Badges */}
                <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                  {dish.isPinned && (
                    <span className="bg-[#DCAE5B] text-[#7C0A11] text-[10px] font-black px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border border-white/40">
                      <Pin className="w-3 h-3 fill-current" />
                      <span>{t.pinnedItem}</span>
                    </span>
                  )}
                  <span className="bg-[#9E121E] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">
                    {t.categories[dish.cat as keyof typeof t.categories] || dish.cat}
                  </span>
                </div>

                <div className="absolute bottom-2.5 end-2.5 bg-black/60 backdrop-blur-md text-white text-xs font-black px-2.5 py-1 rounded-xl shadow border border-white/20">
                  {dish.price}
                </div>
              </div>

              <div className="p-3.5">
                <h3 className="font-black text-sm text-[var(--text-dark)] truncate group-hover:text-[#9E121E] dark:group-hover:text-[#E6BC73] transition-colors">
                  {dish.name}
                </h3>
                <p className="text-xs text-[var(--text-light)] line-clamp-1 mt-1">
                  {dish.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
