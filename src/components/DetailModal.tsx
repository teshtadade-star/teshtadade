import React, { useState } from 'react';
import { Dish, TranslationStrings } from '../types';
import { categoryFallbacks } from '../data/dishes';
import { X, Phone, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { logOrderToGoogleSheets } from '../services/googleWorkspace';

interface DetailModalProps {
  dish: Dish | null;
  isOpen: boolean;
  onClose: () => void;
  t: TranslationStrings;
  whatsappPhone?: string;
  restaurantPhone?: string;
  isAdmin?: boolean;
  onDeleteDish?: (id: number) => void;
  googleSheetId?: string;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  dish,
  isOpen,
  onClose,
  t,
  whatsappPhone = '9647515493953',
  restaurantPhone = '+964 751 549 3953',
  isAdmin,
  onDeleteDish,
  googleSheetId
}) => {
  const [imgError, setImgError] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen || !dish) return null;

  const categoryName =
    t.categories[dish.cat as keyof typeof t.categories] || dish.cat;

  const imgSrc = !imgError && dish.img ? dish.img : categoryFallbacks[dish.cat] || categoryFallbacks['germ'];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${dish.name} - ${t.brand}`,
          text: `${dish.name} (${dish.price}): ${dish.desc}`,
          url: window.location.href
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${dish.name} - ${dish.price}\n${dish.desc}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleInquireWhatsapp = () => {
    if (googleSheetId) {
      logOrderToGoogleSheets(googleSheetId, dish.name, dish.price);
    }
    const rawPhone = whatsappPhone.replace(/[^0-9]/g, '') || "9647515493953";
    const textMsg = encodeURIComponent(
      `سڵاو تێشتا دادی، حەزدکەم دەربارەی ڤێ خوارنێ بپرسم:\n🍽️ ${dish.name} (${dish.price})\nسوپاس!`
    );
    window.open(`https://wa.me/${rawPhone}?text=${textMsg}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A0304]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--card-bg)] border-2 border-[var(--border-accent)] w-full max-w-md rounded-3xl p-5 shadow-2xl my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with category badge & close */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-accent)]">
          <span className="bg-[#9E121E] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {categoryName}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-light)] hover:text-[var(--text-dark)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1:1 Dish Image Container */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-[var(--border-accent)] mb-4 bg-gradient-to-br from-[#F5EAEB] to-[#EAD5D7] dark:from-[#250E10] dark:to-[#160405] shadow-inner">
          <img
            src={imgSrc}
            alt={dish.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title & Price Large */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-2xl font-black text-[var(--text-dark)] leading-snug">
            {dish.name}
          </h2>
          <span className="text-xl font-black text-[#9E121E] dark:text-[#E6BC73] whitespace-nowrap">
            {dish.price}
          </span>
        </div>

        {/* Full Description */}
        <p className="text-sm sm:text-base text-[var(--text-light)] leading-relaxed mb-6 text-justify">
          {dish.desc}
        </p>

        {/* Action Buttons: Phone Call & WhatsApp Inquiry */}
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            {/* Direct Phone Call */}
            <a
              href={`tel:${restaurantPhone.replace(/\s+/g, '')}`}
              className="flex items-center justify-center gap-1.5 bg-[#9E121E] hover:bg-[#7C0A11] text-white font-bold py-3 px-3 rounded-xl transition-all shadow-md text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>{t.callNow}</span>
            </a>

            {/* Direct WhatsApp Inquire */}
            <button
              onClick={handleInquireWhatsapp}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-3 rounded-xl shadow-md text-sm transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتسئەپ</span>
            </button>
          </div>

          {/* Share dish button */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 text-xs text-[var(--text-light)] hover:text-[var(--text-dark)] py-2 transition-colors border border-[var(--border-accent)] rounded-xl mt-1"
          >
            <Share2 className="w-4 h-4" />
            <span>{shared ? 'کۆپی بوو!' : t.shareDish}</span>
          </button>

          {/* Admin Delete Dish Action (ئەڤە ژێ ببە) */}
          {isAdmin && onDeleteDish && (
            <button
              onClick={() => {
                if (window.confirm(`ئەرێ تۆ پشتڕاستی ژ ژێبرنا (${dish.name})؟`)) {
                  onDeleteDish(dish.id);
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-600 py-2.5 rounded-xl border border-rose-500/30 transition-all mt-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>ژێبرنا ڤێ خوارنێ (Delete Dish)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
