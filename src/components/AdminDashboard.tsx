import React, { useState, useMemo } from 'react';
import { Dish, TranslationStrings, Language, CategoryState, AppSettings, HomepageSections } from '../types';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  Database,
  Plus,
  Edit2,
  Trash2,
  Eye,
  LogOut,
  Sun,
  Moon,
  Search,
  Sparkles,
  CheckCircle2,
  Download,
  Upload,
  RotateCcw,
  Store,
  Phone,
  MessageCircle,
  KeyRound,
  Bell,
  Pin,
  ArrowUp,
  ArrowDown,
  Layers,
  Sliders,
  FileSpreadsheet,
  HardDrive,
  MapPin,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { isFirebaseAvailable } from '../services/firebase';
import { EditDishModal } from './EditDishModal';
import { createPasswordCredentials } from '../services/auth';
import {
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  createMenuSpreadsheet,
  syncDishesToGoogleSheets,
  loadDishesFromGoogleSheets,
  uploadImageToGoogleDrive,
  auth as googleAuth
} from '../services/googleWorkspace';

interface AdminDashboardProps {
  dishes: Dish[];
  onSaveDish: (dish: Dish) => void;
  onDeleteDish: (id: number) => void;
  onResetDefaults: () => void;
  onSetDishes?: (dishes: Dish[]) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => void;
  onForceSyncFirebase: () => void;
  t: TranslationStrings;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExitAdmin: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  dishes,
  onSaveDish,
  onDeleteDish,
  onResetDefaults,
  onSetDishes,
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onForceSyncFirebase,
  t,
  currentLang,
  onSelectLang,
  theme,
  onToggleTheme,
  onExitAdmin,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'dishes' | 'sections' | 'settings' | 'sync'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  // Modal for add/edit dish
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dishToEdit, setDishToEdit] = useState<Dish | null>(null);

  // General settings state
  const [brandNameInput, setBrandNameInput] = useState(settings.brandName || t.brand);
  const [subtitleInput, setSubtitleInput] = useState(settings.subtitle || t.subtitle);
  const [phoneInput, setPhoneInput] = useState(settings.restaurantPhone || '+964 751 549 3953');
  const [whatsappInput, setWhatsappInput] = useState(settings.whatsappPhone || '9647515493953');
  const [announcementInput, setAnnouncementInput] = useState(settings.announcement || '');
  const [showAnnouncement, setShowAnnouncement] = useState(settings.showAnnouncement || false);
  const [isOpenState, setIsOpenState] = useState(settings.isOpen !== false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [mapsUrlInput, setMapsUrlInput] = useState(settings.mapsUrl || 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7');
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(settings.googleSheetId || '');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Google Workspace state
  const [googleUser, setGoogleUser] = useState(googleAuth.currentUser);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);

  // Homepage sections state
  const defaultSections: HomepageSections = {
    showFeaturedSlider: true,
    showCategoriesBar: true,
    showLocationSection: true,
    showAnnouncement: true,
    showContactBox: true,
    showFooter: true
  };
  const currentSections = { ...defaultSections, ...(settings.homepageSections || {}) };

  const firebaseConnected = isFirebaseAvailable();

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleGoogleConnect = async () => {
    try {
      setIsGoogleLoading(true);
      const res = await googleSignIn();
      setGoogleUser(res.user);
      showFeedback(`پەیوەست بوو بە هەژماری گووگڵ: ${res.user.displayName || res.user.email} ✅`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'پەیوەستبوون بە گووگڵ سەرکەوتوو نەبوو');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    showFeedback('دەرچوویت لە هەژماری گووگڵ');
  };

  // Google Sheets: Create New Spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    try {
      setIsSheetsSyncing(true);
      showFeedback('دروستکردنی فایلی نوێ لە گووگڵ شیتس...');
      const token = await getAccessToken();
      if (!token) {
        await handleGoogleConnect();
      }

      const res = await createMenuSpreadsheet(`تێشتا دادی - مینیۆ (${new Date().toLocaleDateString('ku')})`);
      setSpreadsheetIdInput(res.spreadsheetId);
      onUpdateSettings({ googleSheetId: res.spreadsheetId });

      // Automatically sync current dishes
      await syncDishesToGoogleSheets(res.spreadsheetId, dishes, {
        ...settings,
        googleSheetId: res.spreadsheetId,
        mapsUrl: mapsUrlInput
      });

      showFeedback('سپریدشیتی گووگڵ بە سەرکەوتوویی دروستکرا و هەموو خواردنەکان نێردران! 📊');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'کێشەیەک ڕوویدا لە دروستکردنی سپریدشیت');
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Google Sheets: Push Current Dishes & Settings to Sheet
  const handlePushToSheets = async () => {
    if (!spreadsheetIdInput.trim()) {
      alert('تکایە سەرەتا فایلی سپریدشیت دروستبکە یان IDی فایلی پێشوو لێرە دابنێ.');
      return;
    }

    try {
      setIsSheetsSyncing(true);
      showFeedback('ناردنی خواردنەکان و ڕێکخستنەکان بۆ گووگڵ شیتس...');
      const cleanId = spreadsheetIdInput.includes('/d/')
        ? spreadsheetIdInput.split('/d/')[1].split('/')[0]
        : spreadsheetIdInput.trim();

      await syncDishesToGoogleSheets(cleanId, dishes, {
        ...settings,
        googleSheetId: cleanId,
        mapsUrl: mapsUrlInput
      });

      onUpdateSettings({ googleSheetId: cleanId });
      showFeedback('داتای مینیۆ و ڕێکخستنەکان بە سەرکەوتوویی لە گووگڵ شیتس نوێکرانەوە! ✅');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'نەتوانرا لەگەڵ گووگڵ شیتس هاوکات بکرێت');
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Google Sheets: Pull / Load Dishes & Settings from Sheet
  const handlePullFromSheets = async () => {
    if (!spreadsheetIdInput.trim()) {
      alert('تکایە IDی فایلی گووگڵ شیتس دیاریبکە.');
      return;
    }

    const confirmed = window.confirm(
      'ئایا دڵنیایت لە هاوردەکردنی مینیۆ لە گووگڵ شیتس؟ ئەمە خواردنەکانی ئێستات بە داتای ناو سپریدشیتەکە نوێ دەکاتەوە.'
    );
    if (!confirmed) return;

    try {
      setIsSheetsSyncing(true);
      showFeedback('خوێندنەوەی خواردنەکان لە سپریدشیتەوە...');
      const cleanId = spreadsheetIdInput.includes('/d/')
        ? spreadsheetIdInput.split('/d/')[1].split('/')[0]
        : spreadsheetIdInput.trim();

      const result = await loadDishesFromGoogleSheets(cleanId);
      if (result.dishes.length > 0 && onSetDishes) {
        onSetDishes(result.dishes);
      }
      if (result.settings) {
        onUpdateSettings({ ...result.settings, googleSheetId: cleanId });
      }

      showFeedback(`${result.dishes.length} خواردن بە سەرکەوتوویی لە گووگڵ شیتسەوە بارکران! 🎉`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'نەتوانرا لە گووگڵ شیتس باربکرێت');
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  const handleOpenAddModal = () => {
    setDishToEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (dish: Dish) => {
    setDishToEdit(dish);
    setIsEditModalOpen(true);
  };

  // Toggle dish pinning
  const handleTogglePin = (dish: Dish) => {
    const nextPinned = !dish.isPinned;
    const updated: Dish = { ...dish, isPinned: nextPinned };
    onSaveDish(updated);
    showFeedback(nextPinned ? `خواردنی (${dish.name}) پین کرا لە سەرەوە!` : `پینی (${dish.name}) لادرا`);
  };

  // Move dish priority order up/down
  const handleMoveOrder = (dish: Dish, direction: 'up' | 'down') => {
    const currentOrder = dish.order ?? 0;
    const delta = direction === 'up' ? -1 : 1;
    const nextOrder = Math.max(0, currentOrder + delta);
    const updated: Dish = { ...dish, order: nextOrder };
    onSaveDish(updated);
    showFeedback(`ڕیزبەندی (${dish.name}) کرا بە ${nextOrder}`);
  };

  const handleToggleDishAvailability = (dish: Dish) => {
    const updated: Dish = {
      ...dish,
      available: dish.available === false ? true : false
    };
    onSaveDish(updated);
    showFeedback(`ڕەوشا (${dish.name}) هاتە گوڕین!`);
  };

  const handleTogglePopular = (dish: Dish) => {
    const updated: Dish = {
      ...dish,
      isPopular: !dish.isPopular
    };
    onSaveDish(updated);
  };

  // Save general settings & cryptographically hash new password if entered
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatePayload: Partial<AppSettings> = {
      brandName: brandNameInput.trim(),
      subtitle: subtitleInput.trim(),
      restaurantPhone: phoneInput.trim(),
      whatsappPhone: whatsappInput.trim(),
      announcement: announcementInput.trim(),
      showAnnouncement,
      isOpen: isOpenState,
      mapsUrl: mapsUrlInput.trim(),
      googleSheetId: spreadsheetIdInput.trim()
    };

    // If new password is provided, securely hash it with random salt
    if (newPasswordInput.trim()) {
      const { hash, salt } = await createPasswordCredentials(newPasswordInput.trim());
      updatePayload.adminPasswordHash = hash;
      updatePayload.adminPasswordSalt = salt;
      setNewPasswordInput('');
      showFeedback('وشەی نهێنی بە شێوازێکی پارێزراو نوێکرایەوە!');
    }

    onUpdateSettings(updatePayload);
    showFeedback(t.savedSuccessfully);
  };

  // Toggle Homepage section visibility
  const handleToggleSection = (sectionKey: keyof HomepageSections) => {
    const next = {
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey]
    };
    onUpdateSettings({ homepageSections: next });
    showFeedback('بەشەکانی پەڕەی سەرەکی نوێکرانەوە!');
  };

  const handleToggleCategory = (catKey: string) => {
    const currentCategories: CategoryState = settings.categoriesState || {
      germ: true,
      sar: true,
      shirin: true,
      vexwarin: true,
      wejbe: true,
      ewaza: true
    };
    const nextCategories: CategoryState = {
      ...currentCategories,
      [catKey]: !currentCategories[catKey]
    };
    onUpdateSettings({ categoriesState: nextCategories });
  };

  const handleToggleStoreStatus = () => {
    const next = !isOpenState;
    setIsOpenState(next);
    onUpdateSettings({ isOpen: next });
    showFeedback(next ? 'چێشتخانە هاتە ڤەکرن!' : 'چێشتخانە هاتە داخستن!');
  };

  // Filtered and sorted dishes for manager view
  const filteredDishes = useMemo(() => {
    const filtered = dishes.filter((dish) => {
      if (filterCat !== 'all' && dish.cat !== filterCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          dish.name.toLowerCase().includes(q) ||
          dish.desc.toLowerCase().includes(q) ||
          dish.price.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Pinned items first, then by priority order ascending
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [dishes, filterCat, searchQuery]);

  const activeCategoriesCount = useMemo(() => {
    const cats = settings.categoriesState || {};
    return Object.values(cats).filter((v) => v !== false).length;
  }, [settings.categoriesState]);

  const availableDishesCount = useMemo(() => {
    return dishes.filter((d) => d.available !== false).length;
  }, [dishes]);

  const pinnedDishesCount = useMemo(() => {
    return dishes.filter((d) => d.isPinned).length;
  }, [dishes]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-dark)] pb-12 transition-colors duration-300">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#161D1A] dark:bg-[#0D1210] border-b-2 border-[#DCAE5B] text-white shadow-xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9E121E] to-[#C1121C] border border-[#DCAE5B] flex items-center justify-center font-black text-xl shadow-md">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl text-[#E6BC73]">
                {t.adminPanelTitle}
              </h1>
              <span className="hidden sm:inline-block bg-[#9E121E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                PRO ADMIN
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="truncate max-w-[140px] sm:max-w-none text-white/80 font-bold">
                {settings.brandName || t.brand}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                ></span>
                <span className="text-[11px] text-gray-300">
                  {firebaseConnected ? 'Firestore پەیوەستە' : 'لۆکاڵ کاش'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          {/* View Customer Menu */}
          <button
            onClick={onExitAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 hover:border-[#DCAE5B]"
            title={t.viewMenuBtn}
          >
            <Eye className="w-4 h-4 text-[#DCAE5B]" />
            <span className="hidden md:inline">{t.viewMenuBtn}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#DCAE5B] transition-colors"
            title="Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Selector */}
          <select
            value={currentLang}
            onChange={(e) => onSelectLang(e.target.value as Language)}
            className="bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl px-2 py-1.5 outline-none focus:border-[#DCAE5B]"
          >
            <option value="badini" className="bg-[#161D1A] text-white">بادینی</option>
            <option value="sorani" className="bg-[#161D1A] text-white">سۆرانی</option>
            <option value="arabic" className="bg-[#161D1A] text-white">عربي</option>
            <option value="english" className="bg-[#161D1A] text-white">English</option>
          </select>

          {/* Log Out */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm"
            title={t.logoutBtn}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t.logoutBtn}</span>
          </button>
        </div>
      </header>

      {/* Main Admin Tabs */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-5">
        {/* Navigation Tabs Pill */}
        <div className="flex items-center gap-1 p-1 bg-[var(--tab-bg)] border border-[var(--border-accent)] rounded-2xl mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? 'bg-[#9E121E] text-white shadow-md'
                : 'text-[var(--text-light)] hover:text-[var(--text-dark)]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.overviewTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'dishes'
                ? 'bg-[#9E121E] text-white shadow-md'
                : 'text-[var(--text-light)] hover:text-[var(--text-dark)]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{t.dishesTab}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {dishes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'sections'
                ? 'bg-[#9E121E] text-white shadow-md'
                : 'text-[var(--text-light)] hover:text-[var(--text-dark)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.sectionsTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-[#9E121E] text-white shadow-md'
                : 'text-[var(--text-light)] hover:text-[var(--text-dark)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t.settingsTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'sync'
                ? 'bg-[#9E121E] text-white shadow-md'
                : 'text-[var(--text-light)] hover:text-[var(--text-dark)]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{t.syncTab}</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {feedbackMsg}
            </span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Dishes */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-light)]">
                    {t.allDishesCount}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#9E121E]/10 text-[#9E121E] dark:text-[#E6BC73] flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[var(--text-dark)]">
                  {dishes.length}
                </div>
                <div className="text-[11px] text-[var(--text-light)] mt-1">
                  {availableDishesCount} بەردەستە • {pinnedDishesCount} پێشەنگ
                </div>
              </div>

              {/* Card 2: Active Categories */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-light)]">
                    {t.categoriesTitle}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#DCAE5B]/15 text-[#7C0A11] dark:text-[#E6BC73] flex items-center justify-center">
                    🍳
                  </div>
                </div>
                <div className="text-3xl font-black text-[var(--text-dark)]">
                  {activeCategoriesCount} / 6
                </div>
                <div className="text-[11px] text-[var(--text-light)] mt-1">
                  بەشێن چاڵاک بۆ کڕیاران
                </div>
              </div>

              {/* Card 3: Restaurant Status */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-light)]">
                    {t.status}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isOpenState
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-rose-500/15 text-rose-600'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-2xl font-black ${
                    isOpenState ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isOpenState ? t.statusOpen : t.statusClosed}
                </div>
                <button
                  onClick={handleToggleStoreStatus}
                  className="mt-2 text-[11px] font-bold underline text-[var(--text-light)] hover:text-[#9E121E]"
                >
                  گۆڕینی ڕەوشێ
                </button>
              </div>

              {/* Card 4: Firebase Live Status */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-light)]">
                    Cloud Firestore
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[var(--text-dark)]">
                  {firebaseConnected ? 'پەیوەستە' : 'لۆکاڵ'}
                </div>
                <div className="text-[11px] text-[var(--text-light)] mt-1 truncate">
                  cool-synthesizer-rkx2q
                </div>
              </div>
            </div>

            {/* Quick Actions & Sections Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Actions Panel */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
                <h3 className="font-black text-base text-[var(--text-dark)] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                  <span>کردارێن بلەز (Quick Actions)</span>
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={handleOpenAddModal}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[#9E121E] text-white font-bold text-xs hover:bg-[#7C0A11] transition-all shadow-md shadow-[#9E121E]/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addNewDish}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('sections')}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[var(--tab-bg)] text-[var(--text-dark)] font-bold text-xs border border-[var(--border-accent)] hover:border-[#9E121E]"
                  >
                    <Layers className="w-4 h-4 text-[#DCAE5B]" />
                    <span>{t.sectionsTab}</span>
                  </button>

                  <button
                    onClick={handleToggleStoreStatus}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-xs transition-all border ${
                      isOpenState
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>{isOpenState ? 'داخستنا چێشتخانێ' : 'ڤەکرنا چێشتخانێ'}</span>
                  </button>

                  <button
                    onClick={onExitAdmin}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-[var(--tab-bg)] text-[var(--text-dark)] font-bold text-xs border border-[var(--border-accent)] hover:border-[#9E121E]"
                  >
                    <Eye className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                    <span>{t.viewMenuBtn}</span>
                  </button>
                </div>
              </div>

              {/* Customer Announcement Banner Box */}
              <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-base text-[var(--text-dark)] flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#DCAE5B]" />
                      <span>{t.announcementLabel}</span>
                    </h3>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={showAnnouncement}
                        onChange={(e) => {
                          setShowAnnouncement(e.target.checked);
                          onUpdateSettings({ showAnnouncement: e.target.checked });
                          showFeedback(e.target.checked ? 'شریتێ ئاگەهداریێ هاتە چاڵاککرن' : 'شریتێ ئاگەهداریێ هاتە ڤەمراندن');
                        }}
                        className="w-4 h-4 accent-[#9E121E] rounded cursor-pointer"
                      />
                      <span>چاڵاکە</span>
                    </label>
                  </div>

                  <p className="text-xs text-[var(--text-light)] mb-2">
                    ئەڤ دەقە دێ ل سەرێ بەرنامەی بۆ کڕیاران دیار بیت.
                  </p>

                  <input
                    type="text"
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="نموونە: تێشتێن گەرم ڕۆژانە ژ دەمژمێر ٦:٠٠ سپێدێ تا ١:٠٠ پشتی نیڤڕۆ ئامادەن..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      onUpdateSettings({ announcement: announcementInput, showAnnouncement });
                      showFeedback(t.savedSuccessfully);
                    }}
                    className="px-4 py-1.5 bg-[#9E121E] text-white text-xs font-bold rounded-xl hover:bg-[#7C0A11] transition-colors"
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISHES MANAGER WITH PRIORITY & PINNING */}
        {activeTab === 'dishes' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Action Bar (Search, Category Filter, Add Button) */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-[var(--text-light)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="گەڕان لە ناوی خواردن یان نرخ..."
                  className="w-full ps-9 pe-4 py-2 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-xs text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {['all', 'germ', 'sar', 'shirin', 'vexwarin', 'wejbe', 'ewaza'].map((catKey) => (
                  <button
                    key={catKey}
                    onClick={() => setFilterCat(catKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      filterCat === catKey
                        ? 'bg-[#9E121E] text-white shadow-sm'
                        : 'bg-[var(--tab-bg)] text-[var(--text-light)] hover:text-[var(--text-dark)] border border-[var(--border-accent)]'
                    }`}
                  >
                    {t.categories[catKey as keyof typeof t.categories] || catKey}
                  </button>
                ))}
              </div>

              {/* Add New Dish Button */}
              <button
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#9E121E] hover:bg-[#7C0A11] text-white text-xs font-bold transition-all shadow-md shadow-[#9E121E]/20"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addNewDish}</span>
              </button>
            </div>

            {/* Dishes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredDishes.map((dish) => {
                const isAvailable = dish.available !== false;
                const catName = t.categories[dish.cat as keyof typeof t.categories] || dish.cat;

                return (
                  <div
                    key={dish.id}
                    className={`relative bg-[var(--card-bg)] border rounded-3xl p-3.5 shadow-sm flex flex-col justify-between transition-all ${
                      dish.isPinned
                        ? 'border-[#DCAE5B] ring-1 ring-[#DCAE5B]/40'
                        : isAvailable
                        ? 'border-[var(--border-accent)]'
                        : 'border-rose-500/30 opacity-75 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Image Thumbnail */}
                      <div className="w-20 h-20 rounded-2xl aspect-square overflow-hidden bg-black/5 border border-[var(--border-accent)] flex-shrink-0 relative">
                        <img
                          src={dish.img}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300';
                          }}
                        />
                        {dish.isPinned && (
                          <span className="absolute top-1 start-1 bg-[#DCAE5B] text-[#7C0A11] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            <span>پین</span>
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="bg-[#9E121E] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {catName}
                          </span>
                          {!isAvailable && (
                            <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              {t.unavailable}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-[var(--text-dark)] truncate">
                          {dish.name}
                        </h4>

                        <span className="font-extrabold text-xs text-[#9E121E] dark:text-[#E6BC73] block mt-0.5">
                          {dish.price}
                        </span>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-light)]">
                          <span>ڕیزبەندی: <strong className="text-[var(--text-dark)]">{dish.order ?? 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="pt-3 mt-3 border-t border-[var(--border-accent)] flex items-center justify-between gap-1">
                      {/* Priority Move Steppers */}
                      <div className="flex items-center gap-1 bg-[var(--tab-bg)] p-0.5 rounded-xl border border-[var(--border-accent)]">
                        <button
                          onClick={() => handleMoveOrder(dish, 'up')}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-light)] hover:text-[#9E121E] hover:bg-black/5 dark:hover:bg-white/10"
                          title="پێشخستن"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1 text-[var(--text-dark)]">
                          {dish.order ?? 0}
                        </span>
                        <button
                          onClick={() => handleMoveOrder(dish, 'down')}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-light)] hover:text-[#9E121E] hover:bg-black/5 dark:hover:bg-white/10"
                          title="دواخستن"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Pin to Top Toggle */}
                      <button
                        onClick={() => handleTogglePin(dish)}
                        className={`p-1.5 rounded-xl border transition-all flex items-center gap-1 text-[11px] font-bold ${
                          dish.isPinned
                            ? 'bg-[#DCAE5B] text-[#7C0A11] border-[#DCAE5B]'
                            : 'bg-[var(--tab-bg)] text-[var(--text-light)] border-[var(--border-accent)] hover:text-[#DCAE5B]'
                        }`}
                        title={dish.isPinned ? t.unpin : t.pinToTop}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Availability toggle */}
                      <button
                        onClick={() => handleToggleDishAvailability(dish)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                          isAvailable
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                        }`}
                      >
                        {isAvailable ? '✓' : '✕'}
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePopular(dish)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            dish.isPopular
                              ? 'text-[#DCAE5B] bg-[#DCAE5B]/15'
                              : 'text-gray-400 hover:text-[#DCAE5B]'
                          }`}
                          title="تایبەت / Popular"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(dish)}
                          className="p-1.5 rounded-lg text-[var(--text-light)] hover:text-[#9E121E] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title={t.editDishTitle}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`ئەرێ تۆ پشتڕاستی ژ ژێبرنا (${dish.name})؟`)) {
                              onDeleteDish(dish.id);
                              showFeedback(`خواردنی (${dish.name}) سڕایەوە!`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={t.deleteDish}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HOMEPAGE SECTIONS MANAGEMENT */}
        {activeTab === 'sections' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 sm:p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-[#9E121E] dark:text-[#E6BC73]" />
                <h3 className="font-black text-lg text-[var(--text-dark)]">
                  {t.sectionsTab} (Homepage Sections Governance)
                </h3>
              </div>
              <p className="text-xs text-[var(--text-light)] mb-6">
                دەتوانیت هەر بەشێکی پەڕەی سەرەکی بە یەک کلیک چالاک بکەیت یان بشاریتەوە.
              </p>

              <div className="space-y-4 max-w-2xl">
                {/* 1. Featured Slider */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#DCAE5B]" />
                      <span>سلایدەری تێشتە پێشەنگ و تایبەتەکان (Featured Hero Carousel)</span>
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      نیشاندانی خواردنە پینکراو و تایبەتەکان بە شێوازی کارۆسێلی گەورە لە سەرەوەی پەڕە.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showFeaturedSlider}
                      onChange={() => handleToggleSection('showFeaturedSlider')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>

                {/* 2. Category Navigation Bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#9E121E]" />
                      <span>شریتی کاتگۆری و پۆلێنەکان (Categories Bar)</span>
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      شریتی جێگیرکراو بۆ فلتەرکردنی خواردنەکان (گەرم، سار، شیریناهی، ڤەخوارن...).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showCategoriesBar}
                      onChange={() => handleToggleSection('showCategoriesBar')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>

                {/* 3. Customer Announcement Banner */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#DCAE5B]" />
                      <span>شریتی ئاگادارییەکانی چێشتخانە (Announcement Banner)</span>
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      نیشاندانی تێبینی یان کاتژمێرەکانی کارکردن لە سەرەوەی مینیۆکە.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showAnnouncement}
                      onChange={() => handleToggleSection('showAnnouncement')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>

                {/* 4. Quick Contact Section */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                      <span>دوگمەی پەیوەندی و تەلەفۆن (Contact & Calling CTA)</span>
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      دوگمەی فەرمی تەلەفۆن و پەیوەندی خێرا بۆ کڕیاران.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showContactBox}
                      onChange={() => handleToggleSection('showContactBox')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>

                {/* 5. Google Maps & Location Section */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                      <span>بەشی ناڤونیشان و نەخشەی گووگڵ (Google Maps Location)</span>
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      نیشاندانی نەخشەی کارلێککار و دوگمەی ڕێنمایی ڕێگا (Get Directions) بۆ کڕیاران.
                    </p>
                    <a
                      href={mapsUrlInput}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#9E121E] dark:text-[#E6BC73] underline mt-1 inline-flex items-center gap-1"
                    >
                      <span>تێستکردنی لینک: {mapsUrlInput}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showLocationSection}
                      onChange={() => handleToggleSection('showLocationSection')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>

                {/* 6. Footer */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-dark)]">
                      فووتەری کۆتایی و زانیاری مافەکان (Footer Attribution)
                    </h4>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      بەشی کۆتایی لاپەڕەکە کە ناوی چێشتخانە و گەشەپێدەر دەگرێتەوە.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSections.showFooter}
                      onChange={() => handleToggleSection('showFooter')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9E121E]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS MANAGER */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveGeneralSettings} className="space-y-6 animate-fadeIn">
            {/* Restaurant Profile Information */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
              <h3 className="font-black text-base text-[var(--text-dark)] mb-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                <span>زانیاریێن چێشتخانێ و پەیوەندیێ</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                    ناڤێ چێشتخانێ (Brand Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={brandNameInput}
                    onChange={(e) => setBrandNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-light)] block mb-1">
                    درووشم / وەسفا کورت (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={subtitleInput}
                    onChange={(e) => setSubtitleInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-light)] block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#9E121E] dark:text-[#E6BC73]" />
                    <span>ژمارەیا تەلەفۆنا فەرمی بۆ پەیوەندیێ</span>
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-light)] block mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ژمارەیا وەتسئەپێ (بێ نیشانا +) بۆ داواکاریان</span>
                  </label>
                  <input
                    type="text"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                </div>

                {/* Google Maps Location Link */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[var(--text-light)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#9E121E] dark:text-[#E6BC73]" />
                      <span>لینکی فەرمی یێ شوێنێ ل سەر گووگڵ ماپس (Google Maps Location URL)</span>
                    </label>
                    <a
                      href={mapsUrlInput}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#9E121E] dark:text-[#E6BC73] underline flex items-center gap-1"
                    >
                      <span>تاقیکردنەوەی شوێن لە نەخشە</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="url"
                    value={mapsUrlInput}
                    onChange={(e) => setMapsUrlInput(e.target.value)}
                    dir="ltr"
                    placeholder="https://maps.app.goo.gl/wCkc752cwjRuUXHp7"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                  <p className="text-[10px] text-[var(--text-light)] mt-1">
                    ئەم لینکە بەکاردێت بۆ دوگمەی &quot;Get Directions on Google Maps&quot; لە لاپەڕەی سەرەکی و فووتەر.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Visibility Manager */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
              <h3 className="font-black text-base text-[var(--text-dark)] mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#DCAE5B]" />
                <span>بڕێڤەبرنا بەش و کاتگۆریان (Active Categories)</span>
              </h3>
              <p className="text-xs text-[var(--text-light)] mb-4">
                ئەو بەشێن ل خوارێ بهێنە هەڵبژاردن دێ ل سەرێ مینیۆیێ بۆ کڕیاران دیار بن.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'germ', label: t.categories.germ, icon: '🔥' },
                  { key: 'sar', label: t.categories.sar, icon: '❄️' },
                  { key: 'shirin', label: t.categories.shirin, icon: '🍯' },
                  { key: 'vexwarin', label: t.categories.vexwarin, icon: '☕' },
                  { key: 'wejbe', label: t.categories.wejbe, icon: '🍽️' },
                  { key: 'ewaza', label: t.categories.ewaza, icon: '🧈' }
                ].map((cat) => {
                  const isVisible = (settings.categoriesState || {})[cat.key] !== false;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleToggleCategory(cat.key)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                        isVisible
                          ? 'bg-[var(--tab-bg)] border-[#9E121E]/30 text-[var(--text-dark)]'
                          : 'bg-black/5 dark:bg-white/5 border-dashed border-gray-400 opacity-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                      <span
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isVisible
                            ? 'bg-[#9E121E] text-white shadow-sm'
                            : 'bg-gray-300 dark:bg-gray-700 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cryptographic Password Change */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
              <h3 className="font-black text-base text-[var(--text-dark)] mb-3 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                <span>پاراستن و گۆڕینی وشەیا نهێنی (Cryptographic SHA-256 Auth)</span>
              </h3>
              <p className="text-xs text-[var(--text-light)] mb-3">
                وشەیا نهێنی ڕاستەوخۆ دەگۆڕدرێت بۆ هاشی SHA-256 و ناتوانرێت بە پشکنینی وێبگەڕ ببینرێت.
              </p>

              <div className="max-w-xs">
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="وشەیا نهێنی یا نوو..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-[#9E121E] hover:bg-[#7C0A11] text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#9E121E]/20 transition-all"
              >
                {t.saveChanges}
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: DATABASE & GOOGLE WORKSPACE */}
        {activeTab === 'sync' && (
          <div className="space-y-6 animate-fadeIn">
            {/* GOOGLE WORKSPACE INTEGRATION (DRIVE & SHEETS) */}
            <div className="bg-[var(--card-bg)] border-2 border-[#DCAE5B] p-5 sm:p-6 rounded-3xl shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[var(--border-accent)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black text-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--text-dark)] flex items-center gap-2">
                      <span>خزمەتگوزارییەکانی گووگڵ (Google Drive & Sheets)</span>
                    </h3>
                    <p className="text-xs text-[var(--text-light)] mt-0.5">
                      پەیوەستکردنی مینیۆ و وێنەکان بە گووگڵ درایڤ و گووگڵ شیتس.
                    </p>
                  </div>
                </div>

                {/* Google Auth Status / Sign in Button */}
                <div>
                  {googleUser ? (
                    <div className="flex items-center gap-2 bg-[var(--tab-bg)] px-3 py-1.5 rounded-2xl border border-emerald-500/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {googleUser.displayName || googleUser.email}
                      </span>
                      <button
                        onClick={handleGoogleDisconnect}
                        className="text-[11px] font-bold text-rose-500 hover:underline ms-2"
                      >
                        دەرچوون
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      disabled={isGoogleLoading}
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#1A1F1C] border border-gray-300 dark:border-gray-700 shadow-sm hover:shadow text-xs font-bold text-gray-800 dark:text-gray-100 hover:border-[#DCAE5B] transition-all cursor-pointer active:scale-98"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isGoogleLoading ? 'پەیوەستبوون...' : 'Sign in with Google (پەیوەست بە)'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Google Sheets Section */}
              <div className="mb-6 p-4.5 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-sm text-[var(--text-dark)] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>گووگڵ شیتس (Google Sheets Database)</span>
                  </h4>

                  {spreadsheetIdInput && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdInput.replace(/.*\/d\//, '').replace(/\/.*$/, '')}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>کردنەوە لە گووگڵ شیتس</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-[var(--text-light)] mb-3">
                  هەموو خواردنەکان، نرخەکان، وەسف، و ڕێکخستنەکان لە سپریدشیت خەزن دەکرێن و بە یەک کلیک دەتوانیت هاوکاتیان بکەیت.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    value={spreadsheetIdInput}
                    onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                    dir="ltr"
                    placeholder="Spreadsheet ID یان لینکی تەواوی فایلی شیتس..."
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--border-accent)] text-[var(--text-dark)] outline-none focus:border-[#9E121E]"
                  />
                  <button
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isSheetsSyncing}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>دروستکردنی سپریدشیتی نوێ</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handlePushToSheets}
                    disabled={isSheetsSyncing || !spreadsheetIdInput}
                    className="px-4 py-2 rounded-xl bg-[#9E121E] hover:bg-[#7C0A11] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>ناردنی مینیۆ بۆ گووگڵ شیتس (Push to Sheets)</span>
                  </button>

                  <button
                    onClick={handlePullFromSheets}
                    disabled={isSheetsSyncing || !spreadsheetIdInput}
                    className="px-4 py-2 rounded-xl bg-[var(--card-bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-accent)] text-xs font-bold text-[var(--text-dark)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>هاوردەکردنی مینیۆ لە گووگڵ شیتس (Load from Sheets)</span>
                  </button>
                </div>
              </div>

              {/* 2. Google Drive Section */}
              <div className="p-4.5 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)]">
                <h4 className="font-black text-sm text-[var(--text-dark)] flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>گووگڵ درایڤ (Google Drive Image Storage)</span>
                </h4>
                <p className="text-xs text-[var(--text-light)] leading-relaxed mb-3">
                  کاتێک وێنەی خواردن لە مۆبایل یان کۆمپیۆتەر هەڵدەبژێریت، ڕاستەوخۆ لە گووگڵ درایڤ باردەکرێت و لینکی ڕاستەوخۆی وێنەکە بۆ مینیۆی کڕیاران دادەنرێت.
                </p>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-light)]">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>خەزنکردنی بەردەوام و گونجاو لەگەڵ بەکارهێنەرانی مۆبایل و کۆمپیۆتەر.</span>
                </div>
              </div>
            </div>

            {/* FIRESTORE CLOUD SYNC */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
              <h3 className="font-black text-base text-[var(--text-dark)] mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                <span>دۆخی فایەربەیس و هەور (Cloud Firestore Sync)</span>
              </h3>
              <p className="text-xs text-[var(--text-light)] mb-4">
                تایبەتمەندیا پاراستنا ئۆتۆماتیکی د فایەربەیسێ فەرمی دا:
              </p>

              <div className="p-4 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)] mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--text-light)]">Project ID:</span>
                  <span className="font-mono text-[#9E121E] dark:text-[#E6BC73]">
                    cool-synthesizer-rkx2q
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--text-light)]">Firestore Database ID:</span>
                  <span className="font-mono text-[var(--text-dark)] truncate max-w-xs">
                    ai-studio-ttadad-01617bd4-b657-4914-875b-6b6cdd849459
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[var(--text-light)]">Sync Status:</span>
                  <span
                    className={`font-bold ${
                      firebaseConnected ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {firebaseConnected ? '✓ پەیوەستە بەردەوام (Cloud Firestore)' : '⚠ کارکردنی لۆکاڵی'}
                  </span>
                </div>
              </div>

              <button
                onClick={onForceSyncFirebase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9E121E] hover:bg-[#7C0A11] text-white text-xs font-bold transition-all shadow-md"
              >
                <Database className="w-4 h-4" />
                <span>مزامەنەکردنی دەستی (Push Local to Firebase)</span>
              </button>
            </div>

            {/* Backup & Restore */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 rounded-3xl shadow-sm">
              <h3 className="font-black text-base text-[var(--text-dark)] mb-2">
                هەناردە و هاوردەکردنی پاڵپشتی (Backup & Restore)
              </h3>
              <p className="text-xs text-[var(--text-light)] mb-4">
                دەتوانی هەموو مینیۆکە بە فۆرماتی JSON دابەزێنیت وەک پاراستن، یان فایلێکی پێشوو باربکەیتەوە.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onExportBackup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-xs font-bold text-[var(--text-dark)] hover:border-[#9E121E] transition-all"
                >
                  <Download className="w-4 h-4 text-[#9E121E] dark:text-[#E6BC73]" />
                  <span>دابەزاندنی نوسخەی یەدەگ (Export Backup)</span>
                </button>

                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--tab-bg)] border border-[var(--border-accent)] text-xs font-bold text-[var(--text-dark)] hover:border-[#9E121E] cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-[#DCAE5B]" />
                  <span>هاوردەکردنی نوسخە (Import Backup)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) onImportBackup(content);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>

                <button
                  onClick={() => {
                    if (window.confirm('ئەرێ تۆ پشتڕاستی ژ زڤڕاندنا مینیۆیێ بۆ حالەتێ بنەڕەتی یێ تێشتا دادی؟')) {
                      onResetDefaults();
                      showFeedback(t.savedSuccessfully);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold transition-all ml-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.resetDefaults}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Add Dish Modal */}
      <EditDishModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(savedDish) => {
          onSaveDish(savedDish);
          showFeedback(t.savedSuccessfully);
        }}
        dishToEdit={dishToEdit}
        t={t}
      />
    </div>
  );
};
