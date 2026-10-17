import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dish, Language, Theme, AppSettings, HomepageSections } from './types';
import { defaultDishes } from './data/dishes';
import { translations } from './data/translations';
import {
  subscribeToDishes,
  subscribeToSettings,
  saveDishesToFirebase,
  saveSettingsToFirebase,
  saveDishToFirestore,
  deleteDishFromFirestore,
  testConnection
} from './services/firebase';
import { Taskbar } from './components/Taskbar';
import { CategoriesBar } from './components/CategoriesBar';
import { DishCard } from './components/DishCard';
import { DetailModal } from './components/DetailModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginView } from './components/AdminLoginView';
import { AdminDashboard } from './components/AdminDashboard';
import { FeaturedSlider } from './components/FeaturedSlider';
import { LocationSection } from './components/LocationSection';
import { Phone, MessageCircle, Bell, Store, Navigation } from 'lucide-react';
import { DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_SALT } from './services/auth';

const DEFAULT_SECTIONS: HomepageSections = {
  showFeaturedSlider: true,
  showCategoriesBar: true,
  showLocationSection: true,
  showAnnouncement: true,
  showContactBox: true,
  showFooter: true
};

const DEFAULT_SETTINGS: AppSettings = {
  brandName: 'تێشتا دادی',
  subtitle: 'تامێ خۆشیا خوارنێن سرۆشتی و کەلتووری',
  restaurantPhone: '+964 751 549 3953',
  whatsappPhone: '9647515493953',
  isOpen: true,
  announcement: 'تێشتێن گەرم ڕۆژانە ژ دەمژمێر ٦:٠٠ سپێدێ تا ١:٠٠ پشتی نیڤڕۆ ئامادەن.',
  showAnnouncement: true,
  categoriesState: { germ: true, sar: true, shirin: true, vexwarin: true, wejbe: true, ewaza: true },
  adminPasswordHash: DEFAULT_ADMIN_HASH,
  adminPasswordSalt: DEFAULT_ADMIN_SALT,
  homepageSections: DEFAULT_SECTIONS,
  mapsUrl: 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7'
};

export default function App() {
  // Helper to detect if current URL is the dedicated admin route
  const checkIsAdminRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/admin' ||
      path.startsWith('/admin/') ||
      path.endsWith('/admin.html') ||
      hash === '#admin' ||
      hash === '#/admin' ||
      hash.startsWith('#admin')
    );
  };

  // --- Dishes State ---
  const [dishes, setDishes] = useState<Dish[]>(() => {
    try {
      const saved = localStorage.getItem('t_dade_dishes');
      return saved ? JSON.parse(saved) : defaultDishes;
    } catch {
      return defaultDishes;
    }
  });

  // --- App Settings State ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('t_dade_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // --- UI Preferences ---
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('t_dade_lang') as Language) || 'badini';
    } catch {
      return 'badini';
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('t_dade_theme') as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  });

  // --- Standalone Route & Admin State ---
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('t_dade_admin_logged') === 'true';
  });

  // --- Customer Menu State ---
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = translations[currentLang] || translations.badini;
  const brandTitle = settings.brandName || t.brand;
  const isOpenStatus = settings.isOpen !== false;
  const sections = { ...DEFAULT_SECTIONS, ...(settings.homepageSections || {}) };

  // --- Firestore connection test on boot per guidelines ---
  useEffect(() => {
    testConnection();
  }, []);

  // --- Route Sync for Standalone Dedicated Admin Route ---
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // --- HTML Dir and Lang Sync ---
  useEffect(() => {
    if (currentLang === 'english') {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    } else if (currentLang === 'arabic') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ku');
    }
    localStorage.setItem('t_dade_lang', currentLang);
  }, [currentLang]);

  // --- Theme Sync ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('t_dade_theme', theme);
  }, [theme]);

  // --- Firebase Firestore Sync ---
  useEffect(() => {
    const unsubDishes = subscribeToDishes((liveDishes) => {
      setDishes(liveDishes);
      localStorage.setItem('t_dade_dishes', JSON.stringify(liveDishes));
    }, defaultDishes);

    const unsubSettings = subscribeToSettings((liveSettings) => {
      setSettings((prev) => {
        const merged = { ...prev, ...liveSettings };
        localStorage.setItem('t_dade_settings', JSON.stringify(merged));
        return merged;
      });
    });

    return () => {
      unsubDishes();
      unsubSettings();
    };
  }, []);

  // --- Admin Save & Sync Handlers ---
  const handleSaveDish = useCallback((dish: Dish) => {
    setDishes((prev) => {
      const exists = prev.some((d) => d.id === dish.id);
      const next = exists ? prev.map((d) => (d.id === dish.id ? dish : d)) : [dish, ...prev];
      localStorage.setItem('t_dade_dishes', JSON.stringify(next));
      return next;
    });
    saveDishToFirestore(dish);
  }, []);

  const handleDeleteDish = useCallback((id: number) => {
    setDishes((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem('t_dade_dishes', JSON.stringify(next));
      return next;
    });
    deleteDishFromFirestore(id);
  }, []);

  const handleResetDefaults = useCallback(() => {
    setDishes(defaultDishes);
    localStorage.setItem('t_dade_dishes', JSON.stringify(defaultDishes));
    saveDishesToFirebase(defaultDishes);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('t_dade_settings', JSON.stringify(updated));
      saveSettingsToFirebase(updated);
      return updated;
    });
  }, []);

  const handleForceSyncFirebase = useCallback(() => {
    saveDishesToFirebase(dishes);
    saveSettingsToFirebase(settings);
  }, [dishes, settings]);

  // Backup handlers
  const handleExportBackup = useCallback(() => {
    const data = {
      dishes,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.1'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testa-dade-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dishes, settings]);

  const handleImportBackup = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.dishes && Array.isArray(data.dishes)) {
        setDishes(data.dishes);
        localStorage.setItem('t_dade_dishes', JSON.stringify(data.dishes));
        saveDishesToFirebase(data.dishes);
      }
      if (data.settings && typeof data.settings === 'object') {
        const merged = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(merged);
        localStorage.setItem('t_dade_settings', JSON.stringify(merged));
        saveSettingsToFirebase(merged);
      }
      alert('بەرگی یەدەگ ب سەرکەفتیانە هاتە هاوردەکرن!');
    } catch {
      alert('فایلی هەڵبژێردراو نادروستە!');
    }
  }, []);

  // --- Standalone Navigation & Auth Handlers ---
  const navigateToCustomer = useCallback(() => {
    if (window.location.hash) {
      window.location.hash = '';
    }
    if (window.location.pathname.toLowerCase().includes('admin')) {
      window.history.pushState(null, '', '/');
    }
    setIsAdminRoute(false);
  }, []);

  const handleAdminLoginSuccess = useCallback(() => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('t_dade_admin_logged', 'true');
  }, []);

  const handleAdminLogout = useCallback(() => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('t_dade_admin_logged');
  }, []);

  // --- Filtered Customer Dishes (Ordered with Pinned Items First) ---
  const filteredDishes = useMemo(() => {
    const catsState = settings.categoriesState || DEFAULT_SETTINGS.categoriesState!;

    const result = dishes.filter((dish) => {
      // Check if category is enabled in settings
      if (catsState[dish.cat] === false) return false;

      // Filter by active category tab
      if (activeCategory !== 'all' && dish.cat !== activeCategory) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = dish.name.toLowerCase().includes(q);
        const matchDesc = dish.desc.toLowerCase().includes(q);
        const matchCat = dish.cat.toLowerCase().includes(q);
        return matchName || matchDesc || matchCat;
      }

      return true;
    });

    // Pinned dishes appear first, followed by custom order priority ascending
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [dishes, settings.categoriesState, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const catsState = settings.categoriesState || DEFAULT_SETTINGS.categoriesState!;
    const counts: Record<string, number> = { all: 0 };
    dishes.forEach((d) => {
      if (catsState[d.cat] !== false) {
        counts.all = (counts.all || 0) + 1;
        counts[d.cat] = (counts[d.cat] || 0) + 1;
      }
    });
    return counts;
  }, [dishes, settings.categoriesState]);

  // ==========================================
  // VIEW 1: DEDICATED STANDALONE ADMIN ROUTE (/admin, /admin.html, #admin)
  // Accessible ONLY by direct URL, password protected
  // ==========================================
  if (isAdminRoute) {
    if (!isAdminLoggedIn) {
      return (
        <AdminLoginView
          onSuccess={handleAdminLoginSuccess}
          onGoToCustomerMenu={navigateToCustomer}
          t={t}
          storedHash={settings.adminPasswordHash}
          storedSalt={settings.adminPasswordSalt}
        />
      );
    }

    return (
      <AdminDashboard
        dishes={dishes}
        onSaveDish={handleSaveDish}
        onDeleteDish={handleDeleteDish}
        onResetDefaults={handleResetDefaults}
        onSetDishes={setDishes}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onForceSyncFirebase={handleForceSyncFirebase}
        t={t}
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onExitAdmin={navigateToCustomer}
        onLogout={handleAdminLogout}
      />
    );
  }

  // ==========================================
  // VIEW 2: PUBLIC CUSTOMER MENU (/)
  // Pure customer experience - zero admin UI/triggers
  // ==========================================
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-dark)] transition-colors duration-300">
      {/* 1. Fixed Top Taskbar */}
      <div>
        <Taskbar
          brandTitle={brandTitle}
          t={t}
          theme={theme}
          isOpenStatus={isOpenStatus}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          onOpenSettings={() => setIsSettingsOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* 2. Fixed Categories Bar (Conditional on homepageSections.showCategoriesBar) */}
      {sections.showCategoriesBar && (
        <div>
          <CategoriesBar
            t={t}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            categoriesState={settings.categoriesState || DEFAULT_SETTINGS.categoriesState!}
            categoryCounts={categoryCounts}
          />
        </div>
      )}

      {/* 3. Main Customer Container */}
      <main
        className={`max-w-[900px] mx-auto px-3 sm:px-4 pb-16 ${
          sections.showCategoriesBar ? 'pt-[135px]' : 'pt-[85px]'
        }`}
      >
        {/* Customer Announcement Banner (Conditional on showAnnouncement) */}
        {sections.showAnnouncement && settings.showAnnouncement && settings.announcement && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-[#9E121E]/15 via-[#DCAE5B]/20 to-[#9E121E]/15 border border-[#DCAE5B]/40 flex items-center gap-2.5 text-xs font-bold text-[var(--text-dark)] shadow-sm animate-fadeIn">
            <Bell className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73] flex-shrink-0 animate-bounce" />
            <span className="flex-1 leading-relaxed">{settings.announcement}</span>
          </div>
        )}

        {/* Closed Store Banner Notice */}
        {!isOpenStatus && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm animate-fadeIn">
            <Store className="w-4 h-4 flex-shrink-0" />
            <span>
              چێشتخانە لەم کاتەدا داخراوە. دەتوانیت سەیری مینیۆ بکەیت یان بۆ داواکارییەکانی سبەینێ لەگەڵمان پەیوەندی بکەیت.
            </span>
          </div>
        )}

        {/* Featured Slider (Conditional on showFeaturedSlider) */}
        {sections.showFeaturedSlider && !searchQuery && (
          <FeaturedSlider
            dishes={dishes}
            t={t}
            onSelectDish={setSelectedDish}
          />
        )}

        {/* Active Search Filter Pill */}
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between bg-[var(--tab-bg)] border border-[var(--border-accent)] px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-light)]">
            <span>
              ئەنجامێن گەڕانێ بۆ: &quot;{searchQuery}&quot; ({filteredDishes.length})
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#9E121E] dark:text-[#E6BC73] underline"
            >
              لابردن
            </button>
          </div>
        )}

        {/* 2-Column Dish Grid (Ordered with Pinned Items First) */}
        {filteredDishes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
            {filteredDishes.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                t={t}
                onOpenDetail={setSelectedDish}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[var(--card-bg)] rounded-3xl border border-[var(--border-accent)] p-6">
            <div className="text-4xl mb-3">🍳</div>
            <h3 className="font-bold text-lg mb-1">{t.noDishesFound}</h3>
            <p className="text-xs text-[var(--text-light)] max-w-xs mx-auto">
              تکایە دڵنیابە لە ناوی خواردنەکە یان پۆلێنی هەموو بەرهەمەکان هەڵبژێرە.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#9E121E] text-white rounded-xl text-xs font-bold hover:bg-[#7C0A11] transition-colors"
            >
              {t.categories.all}
            </button>
          </div>
        )}

        {/* Interactive Location / Find Us Section (Conditional on showLocationSection) */}
        {sections.showLocationSection && (
          <LocationSection
            t={t}
            mapsUrl={settings.mapsUrl || 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7'}
            restaurantPhone={settings.restaurantPhone}
            whatsappPhone={settings.whatsappPhone}
          />
        )}

        {/* Quick Contact & Calling Section (Conditional on showContactBox) */}
        {sections.showContactBox && (
          <div className="mt-6 p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-accent)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div>
              <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                <span>پەیوەندیی ڕاستەوخۆ بە چێشتخانەی تێشتا دادی</span>
              </h4>
              <p className="text-xs text-[var(--text-light)] mt-0.5">
                بۆ پرسیار دەربارەی خواردنەکان و حجزکردنی مێز
              </p>
            </div>
            <a
              href={`tel:${settings.restaurantPhone || '+9647515493953'}`}
              dir="ltr"
              className="px-5 py-2.5 rounded-xl bg-[#9E121E] hover:bg-[#7C0A11] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{settings.restaurantPhone || '+964 751 549 3953'}</span>
            </a>
          </div>
        )}

        {/* Customer App Footer (Conditional on showFooter) */}
        {sections.showFooter && (
          <footer className="mt-14 pt-8 pb-4 text-center border-t-2 border-dashed border-[var(--border-accent)] text-[var(--text-light)]">
            <p className="font-black text-xl text-[var(--text-dark)] mb-1">
              {brandTitle}
            </p>
            <p className="text-xs text-[var(--text-light)] mb-3">
              {settings.subtitle || t.subtitle}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <a
                href={`tel:${settings.restaurantPhone || '+9647515493953'}`}
                dir="ltr"
                className="inline-flex items-center gap-2 font-black text-base text-[#9E121E] dark:text-[#E6BC73] hover:underline px-3 py-1.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)]"
              >
                <Phone className="w-4 h-4" />
                <span>{settings.restaurantPhone || '+964 751 549 3953'}</span>
              </a>

              {/* Get Directions on Google Maps Footer Button */}
              <a
                href={settings.mapsUrl || 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-xs text-white bg-[#9E121E] hover:bg-[#7C0A11] px-4 py-2 rounded-xl shadow-sm transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-[#DCAE5B]" />
                <span>Get Directions on Google Maps</span>
              </a>
            </div>

            {/* Developer Attribution */}
            <div className="mt-6 text-[11px] text-[var(--text-light)] opacity-80 flex items-center justify-center gap-2">
              <span>گەشەپێدراوە لەلایەن </span>
              <a
                href="tel:07507100238"
                className="font-bold text-[#9E121E] dark:text-[#E6BC73] underline"
              >
                {t.developerName}
              </a>
              <span>•</span>
              <span dir="ltr">07507100238</span>
            </div>
          </footer>
        )}
      </main>

      {/* Floating Quick WhatsApp Inquire Action */}
      <aside aria-label="Restaurant Quick Actions" className="fixed bottom-4 end-4 z-40 flex flex-col gap-2">
        <a
          href={`https://wa.me/${settings.whatsappPhone || '9647515493953'}?text=${encodeURIComponent('سڵاو تێشتا دادی، حەزدکەم دەربارەی مینیۆی خوارنان بپرسم')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl hover:bg-emerald-700 active:scale-95 transition-all"
          aria-label="Direct WhatsApp message"
          title="واتسئەپ"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      </aside>

      {/* 4. Dish Detail Modal (Customer view: read-only) */}
      <DetailModal
        dish={selectedDish}
        isOpen={Boolean(selectedDish)}
        onClose={() => setSelectedDish(null)}
        t={t}
        whatsappPhone={settings.whatsappPhone}
        restaurantPhone={settings.restaurantPhone}
        isAdmin={false}
        googleSheetId={settings.googleSheetId}
      />

      {/* 5. User Settings Modal (Customer preferences only: language & theme) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        t={t}
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        theme={theme}
        onSelectTheme={setTheme}
      />
    </div>
  );
}
