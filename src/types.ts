export type Language = 'badini' | 'sorani' | 'arabic' | 'english';
export type Theme = 'light' | 'dark';

export type CategoryKey = 'germ' | 'sar' | 'shirin' | 'vexwarin' | 'wejbe' | 'ewaza';

export interface Dish {
  id: number;
  name: string;
  price: string;
  desc: string;
  cat: CategoryKey | string;
  img: string;
  isPopular?: boolean;
  available?: boolean;
  isPinned?: boolean; // Pin to top
  order?: number;     // Priority display order
}

export type CategoryState = Record<string, boolean>;

export interface HomepageSections {
  showFeaturedSlider: boolean;
  showCategoriesBar: boolean;
  showLocationSection: boolean;
  showAnnouncement: boolean;
  showContactBox: boolean;
  showFooter: boolean;
}

export interface AppSettings {
  brandName?: string;
  subtitle?: string;
  restaurantPhone?: string;
  whatsappPhone?: string;
  isOpen?: boolean;
  announcement?: string;
  showAnnouncement?: boolean;
  categoriesState?: CategoryState;
  adminPasswordHash?: string;
  adminPasswordSalt?: string;
  homepageSections?: HomepageSections;
  mapsUrl?: string;
  googleSheetId?: string;
  googleDriveFolderId?: string;
}

export interface TranslationStrings {
  brand: string;
  subtitle: string;
  status: string;
  statusOpen: string;
  statusClosed: string;
  modalTitle: string;
  langTitle: string;
  themeTitle: string;
  lightTheme: string;
  darkTheme: string;
  apply: string;
  editBtn: string;
  cancelBtn: string;
  closeBtn: string;
  searchPlaceholder: string;
  noDishesFound: string;
  categoriesTitle: string;
  developerTitle: string;
  developerName: string;
  developerPhone: string;
  restaurantPhone: string;
  orderViaWhatsapp: string;
  callNow: string;
  shareDish: string;
  dishDetails: string;
  currency: string;
  orderSummary: string;
  allDishesCount: string;
  adminTitle: string;
  addNewDish: string;
  editDishTitle: string;
  dishNameLabel: string;
  dishPriceLabel: string;
  dishCategoryLabel: string;
  dishDescLabel: string;
  dishImageUrlLabel: string;
  saveChanges: string;
  deleteDish: string;
  resetDefaults: string;
  savedSuccessfully: string;
  adminPanelTitle: string;
  adminLoginTitle: string;
  adminPasswordPlaceholder: string;
  loginBtn: string;
  logoutBtn: string;
  wrongPassword: string;
  viewMenuBtn: string;
  overviewTab: string;
  dishesTab: string;
  settingsTab: string;
  syncTab: string;
  sectionsTab: string;
  available: string;
  unavailable: string;
  popularItem: string;
  pinnedItem: string;
  pinToTop: string;
  unpin: string;
  orderPriorityLabel: string;
  moveUp: string;
  moveDown: string;
  uploadFromDevice: string;
  dragDropImage: string;
  choosePhoto: string;
  featuredDishes: string;
  restaurantStatusLabel: string;
  announcementLabel: string;
  categories: {
    all: string;
    germ: string;
    sar: string;
    shirin: string;
    vexwarin: string;
    wejbe: string;
    ewaza: string;
  };
}
