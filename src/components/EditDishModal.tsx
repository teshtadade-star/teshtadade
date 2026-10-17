import React, { useState, useEffect, useRef } from 'react';
import { Dish, TranslationStrings } from '../types';
import { X, Image as ImageIcon, Sparkles, Upload, Pin, CheckCircle2, RefreshCw, CloudUpload } from 'lucide-react';
import { categoryFallbacks } from '../data/dishes';
import { processAndCompressImage, formatFileSize } from '../utils/imageUpload';
import { uploadImageToGoogleDrive, getAccessToken } from '../services/googleWorkspace';

interface EditDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dish: Dish) => void;
  dishToEdit: Dish | null;
  t: TranslationStrings;
}

const PRESET_IMAGES = [
  { label: 'هێک و سجووق', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80' },
  { label: 'سینییا مەزن', url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=80' },
  { label: 'مەنەمەن / هێک', url: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&auto=format&fit=crop&q=80' },
  { label: 'قەیماخ و هنگڤین', url: 'https://images.unsplash.com/photo-1584736286279-4172579b29cc?w=600&auto=format&fit=crop&q=80' },
  { label: 'کولێرا تنوورێ', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80' },
  { label: 'چایا ب هێلێ', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80' },
  { label: 'گۆشت و هێک', url: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600&auto=format&fit=crop&q=80' },
  { label: 'پەنێر و گوێز', url: 'https://images.unsplash.com/photo-1552763443-1589487d27e5?w=600&auto=format&fit=crop&q=80' }
];

export const EditDishModal: React.FC<EditDishModalProps> = ({
  isOpen,
  onClose,
  onSave,
  dishToEdit,
  t
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('germ');
  const [desc, setDesc] = useState('');
  const [img, setImg] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [available, setAvailable] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [order, setOrder] = useState<number>(0);

  // File upload state
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [activeImgMode, setActiveImgMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dishToEdit) {
      setName(dishToEdit.name);
      setPrice(dishToEdit.price);
      setCat(dishToEdit.cat);
      setDesc(dishToEdit.desc);
      setImg(dishToEdit.img);
      setIsPopular(Boolean(dishToEdit.isPopular));
      setAvailable(dishToEdit.available !== false);
      setIsPinned(Boolean(dishToEdit.isPinned));
      setOrder(dishToEdit.order ?? 0);
    } else {
      setName('');
      setPrice('');
      setCat('germ');
      setDesc('');
      setImg('');
      setIsPopular(false);
      setAvailable(true);
      setIsPinned(false);
      setOrder(0);
    }
    setUploadFeedback(null);
  }, [dishToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle file chosen from phone or PC with automatic Google Drive upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setUploadFeedback('پێداچوونەوە و پەستاندنی وێنە...');

      const result = await processAndCompressImage(file, 1000, 0.82);
      setImg(result.dataUrl);

      // Check if user has Google Workspace token
      const token = await getAccessToken();
      if (token) {
        setUploadFeedback('بارکردن بۆ گووگڵ درایڤ (Google Drive)...');
        const driveRes = await uploadImageToGoogleDrive(file, `dade_${name ? name.replace(/\s+/g, '_') : 'dish'}_${Date.now()}`);
        setImg(driveRes.directUrl);
        setUploadFeedback('وێنەکە لە گووگڵ درایڤ خەزنکرا و لینکی ڕاستەوخۆ دانرا! ✅');
      } else {
        const origText = formatFileSize(result.originalSize);
        const compText = formatFileSize(result.compressedSize);
        setUploadFeedback(`وێنە بە سەرکەوتوویی بارکرا (${origText} ➔ ${compText})`);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'کێشەیەک ڕوویدا لە بارکردنی وێنەدا');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

    const dishData: Dish = {
      id: dishToEdit ? dishToEdit.id : Date.now(),
      name: name.trim(),
      price: price.trim(),
      cat,
      desc: desc.trim() || 'خواردنێکی بەتام و تەندروست لە تێشتا دادی',
      img: img.trim() || categoryFallbacks[cat] || categoryFallbacks['germ'],
      isPopular,
      available,
      isPinned,
      order: Number(order) || 0
    };

    onSave(dishData);
    onClose();
  };

  const previewImg = img || categoryFallbacks[cat] || categoryFallbacks['germ'];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A0304]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--card-bg)] border-2 border-[var(--border-accent)] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92vh] overflow-y-auto animate-scaleUp text-[var(--text-dark)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-accent)]">
          <h3 className="text-xl font-black text-[var(--text-dark)]">
            {dishToEdit ? t.editDishTitle : t.addNewDish}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-light)] hover:text-[var(--text-dark)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IMAGE UPLOAD / PREVIEW SECTION */}
          <div className="bg-[var(--tab-bg)] p-3.5 rounded-2xl border border-[var(--border-accent)]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[var(--text-dark)] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                <span>{t.dishImageUrlLabel}</span>
              </label>

              {/* Mode Toggle: Device Upload vs URL */}
              <div className="flex bg-[var(--card-bg)] p-0.5 rounded-lg border border-[var(--border-accent)] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveImgMode('upload')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeImgMode === 'upload'
                      ? 'bg-[#9E121E] text-white'
                      : 'text-[var(--text-light)]'
                  }`}
                >
                  {t.uploadFromDevice}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImgMode('url')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeImgMode === 'url'
                      ? 'bg-[#9E121E] text-white'
                      : 'text-[var(--text-light)]'
                  }`}
                >
                  لینکی URL
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {/* Preview Box */}
              <div className="relative w-28 h-28 aspect-square rounded-2xl overflow-hidden border-2 border-[var(--border-accent)] shadow-sm bg-black/5 flex-shrink-0 flex items-center justify-center">
                <img
                  src={previewImg}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = categoryFallbacks[cat] || categoryFallbacks['germ'];
                  }}
                />
                {isProcessingFile && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls or URL Input */}
              <div className="flex-1 w-full space-y-2">
                {activeImgMode === 'upload' ? (
                  <div>
                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isProcessingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#9E121E]/40 hover:border-[#9E121E] bg-[var(--card-bg)] hover:bg-[#9E121E]/5 transition-all text-center flex flex-col items-center justify-center gap-1 group cursor-pointer"
                    >
                      <Upload className="w-5 h-5 text-[#9E121E] dark:text-[#E6BC73] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-[var(--text-dark)]">
                        {t.choosePhoto}
                      </span>
                      <span className="text-[10px] text-[var(--text-light)]">
                        (مۆبایل، کامێرا، یان فایلی کۆمپیۆتەر)
                      </span>
                    </button>

                    {uploadFeedback && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{uploadFeedback}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={img}
                      onChange={(e) => setImg(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                    />

                    {/* Quick Image Presets */}
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      <span className="text-[10px] text-[var(--text-light)] self-center">پێشنیار:</span>
                      {PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setImg(preset.url)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--card-bg)] hover:bg-[#9E121E]/15 border border-[var(--border-accent)] font-semibold transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                {t.dishNameLabel} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="نموونە: هێک ب سجووقا حەلال"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                {t.dishPriceLabel} *
              </label>
              <input
                type="text"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="نموونە: ٦,٢٥٠ د.ع"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
              />
            </div>
          </div>

          {/* Category & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                {t.dishCategoryLabel}
              </label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
              >
                <option value="germ">{t.categories.germ} (Hot)</option>
                <option value="sar">{t.categories.sar} (Cold)</option>
                <option value="shirin">{t.categories.shirin} (Desserts)</option>
                <option value="vexwarin">{t.categories.vexwarin} (Drinks)</option>
                <option value="wejbe">{t.categories.wejbe} (Meals)</option>
                <option value="ewaza">{t.categories.ewaza} (Extras)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                {t.orderPriorityLabel} (ژمارەیا پێشینە)
              </label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
              {t.dishDescLabel}
            </label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="وەسفا تەمام و پێکهاتەکان..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E] resize-none"
            />
          </div>

          {/* Priority & Status Toggles: Pin to Top, Popular, Available */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Pin to Top */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-[#DCAE5B] rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-[var(--text-dark)] flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-[#DCAE5B]" />
                <span>{t.pinToTop}</span>
              </span>
            </label>

            {/* Popular */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 accent-[#9E121E] rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-[var(--text-dark)] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#DCAE5B]" />
                <span>{t.popularItem}</span>
              </span>
            </label>

            {/* Available */}
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-[var(--text-dark)]">
                {t.available}
              </span>
            </label>
          </div>

          {/* Submit & Cancel */}
          <div className="flex gap-2.5 pt-3 border-t border-[var(--border-accent)]">
            <button
              type="submit"
              disabled={isProcessingFile}
              className="flex-1 py-3 bg-[#9E121E] hover:bg-[#7C0A11] text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
            >
              {t.saveChanges}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[var(--border-accent)] text-sm font-bold text-[var(--text-light)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {t.cancelBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
