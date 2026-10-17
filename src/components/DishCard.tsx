import React, { useState } from 'react';
import { Dish, TranslationStrings } from '../types';
import { categoryFallbacks } from '../data/dishes';
import { Star, Pin } from 'lucide-react';

interface DishCardProps {
  dish: Dish;
  t: TranslationStrings;
  onOpenDetail: (dish: Dish) => void;
}

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  t,
  onOpenDetail
}) => {
  const [imgError, setImgError] = useState(false);

  const isAvailable = dish.available !== false;

  const categoryName =
    t.categories[dish.cat as keyof typeof t.categories] || dish.cat;

  const imgSrc = !imgError && dish.img ? dish.img : categoryFallbacks[dish.cat] || categoryFallbacks['germ'];

  return (
    <div
      onClick={() => onOpenDetail(dish)}
      className={`group relative bg-[var(--card-bg)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border flex flex-col cursor-pointer transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] ${
        dish.isPinned
          ? 'border-[#DCAE5B] ring-1 ring-[#DCAE5B]/40'
          : 'border-[var(--border-accent)]'
      } ${!isAvailable ? 'opacity-70' : ''}`}
    >
      {/* 1:1 Square Image Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-[#F5EAEB] to-[#EAD5D7] dark:from-[#250E10] dark:to-[#160405] flex items-center justify-center">
        <img
          src={imgSrc}
          alt={dish.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            !isAvailable ? 'grayscale-[50%]' : ''
          }`}
        />

        {/* Category Badge & Pin Badge */}
        <div className="absolute top-2.5 start-2.5 flex flex-col gap-1 z-10">
          <span className="bg-[#9E121E] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md border border-white/20">
            {categoryName}
          </span>
          {dish.isPinned && (
            <span className="bg-[#DCAE5B] text-[#7C0A11] text-[10px] font-black px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border border-white/40">
              <Pin className="w-3 h-3 fill-current" />
              <span>{t.pinnedItem}</span>
            </span>
          )}
        </div>

        {/* Unavailable or Popular Tag */}
        {!isAvailable ? (
          <span className="absolute top-2.5 end-2.5 bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md z-10">
            {t.unavailable}
          </span>
        ) : dish.isPopular && !dish.isPinned ? (
          <span className="absolute top-2.5 end-2.5 bg-[#DCAE5B] text-[#7C0A11] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md z-10 flex items-center gap-1 border border-white/30">
            <Star className="w-3 h-3 fill-current" />
            <span>مميز</span>
          </span>
        ) : null}
      </div>

      {/* Details Box */}
      <div className="p-3.5 flex flex-col justify-between flex-grow">
        <div>
          {/* Title & Price */}
          <div className="flex flex-col gap-0.5 mb-1.5">
            <h3 className="font-bold text-base text-[var(--text-dark)] leading-snug group-hover:text-[#9E121E] dark:group-hover:text-[#E6BC73] transition-colors">
              {dish.name}
            </h3>
            <span className="font-extrabold text-[15px] text-[#9E121E] dark:text-[#E6BC73]">
              {dish.price}
            </span>
          </div>

          {/* Description truncated */}
          <p className="text-xs text-[var(--text-light)] line-clamp-2 leading-relaxed">
            {dish.desc}
          </p>
        </div>
      </div>
    </div>
  );
};
