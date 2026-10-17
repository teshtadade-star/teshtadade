# Têşta Dadê - Professional Admin & Menu Management Upgrade

A comprehensive upgrade to Têşta Dadê adding secure cryptographic admin authentication, custom post priority ordering and item pinning, direct device photo upload with compression and storage sync, dynamic homepage section toggling, and clean interface separation.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions were skipped by the user, so recommended production-grade defaults are adopted:
> - **Authentication**: Cryptographic SHA-256 salted hash verification stored securely in Firestore (`settings/app`), eliminating any inspectable plain-text passwords in browser code.
> - **Image Upload**: Multi-source file uploader supporting direct camera/gallery uploads with HTML5 Canvas automatic image compression (balanced size/clarity under 200KB) and Firestore sync, plus image URL support.
> - **Ordering**: Dual-mode ordering supporting both "Pin to Top" priority toggle and numerical sequence ordering.
> - **Homepage Sections**: Granular section controls in Admin allowing instant toggling of the Featured Slider, Category Tabs, Announcement Banner, Quick Contact CTA, and Footer.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. **Zero-Leak Admin Security**: Secure login portal authenticated via salted cryptographic hash verification stored in Firestore, with session token timeouts and no hardcoded plain-text credentials in JavaScript.
  2. **Post Ordering & Pin to Top**: Ability for the restaurant manager to control exactly which breakfast dishes appear first (e.g. daily specials, new dishes) using numerical priority order and a 1-tap "Pin to Top" feature.
  3. **Homepage Sections Governance**: A visual control room in Admin to toggle visibility of any major customer-facing section (Featured Hero Slider, Category Tabs, Announcement Banner, Contact Bar).
  4. **Direct Device Photo Upload**: File uploader (`<input type="file" accept="image/*">`) enabling staff to snap a photo or pick from phone gallery/desktop storage with client-side compression and instant preview.
  5. **Clean Route & View Partitioning**: Dedicated `#admin` route with strict authentication boundary separating customer menu browsing from manager controls.

---

## 2. User Experience & Visual Design

### Customer View Experience:
- **Hero Carousel / Featured Slider**: Displays top pinned dishes with smooth sliding cards, large appetising imagery, and pricing in Kurdistan dinars. Can be shown or hidden via Admin settings.
- **Ordered Dish Grid**: Pinned dishes appear first with a gold ribbon tag (`پێشەنگ / Pinned`), followed by dishes in the manager's assigned order sequence.
- **Pristine Aesthetics**: Deep burgundy (`#9E121E`) and Kurdistan gold (`#DCAE5B`) with Kurdish Zain & Cairo typography.

### Admin Experience:
- **Dedicated Admin Portal**: Accessible via `#admin` or hidden lock. Completely isolated from the customer view.
- **Dishes Ordering Controls**: In the Dishes tab, each item displays:
  - "Pin to Top" toggle button with pin icon.
  - Priority order stepper (`▲` / `▼` or numeric priority input).
  - Drag-or-click reordering with live preview.
- **Device Image Uploader**:
  - Drag-and-drop zone or "Choose from Device" file picker button.
  - Camera support on mobile devices.
  - Instant image thumbnail preview with file size indicator.
  - Compression to maintain swift load times.
- **Homepage Sections Switchboard**:
  - Clean card with toggle switches for:
    - `Featured Hero Slider`
    - `Announcement Banner`
    - `Category Navigation Bar`
    - `Quick Contact & Phone Bar`
    - `Footer & Attribution`

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cryptographic Salted Hashing vs Plain-text Credentials**
  - *Chosen Approach*: Web Crypto API (`crypto.subtle.digest('SHA-256')`) with unique salt stored in Firestore document `settings/app`.
  - *Why*: Eliminates security vulnerabilities where passwords could be inspected in browser DevTools or source bundles.
  - *Alternative Considered*: Firebase Auth Email/Password. Salted hashing in Firestore is self-contained, requires no email verification or third-party sign-up screens, and allows the restaurant owner to immediately manage credentials from their custom dashboard.

- **Decision 2: Client-Side Canvas Image Compression**
  - *Chosen Approach*: HTML5 Canvas resize and JPEG compression to ~1000px max dimension, quality 0.82.
  - *Why*: Direct phone photos are 5–15MB, which would exceed Firestore document limits and slow down customer mobile networks. Compression reduces them to ~150KB without perceptual loss of food detail, loading instantly on mobile devices.

- **Decision 3: Section Management State in Firestore**
  - *Chosen Approach*: Store `homepageSections` in the existing `settings/app` Firestore document with real-time `onSnapshot` listeners.
  - *Why*: Instantaneous sync across all connected customer phones when the admin flips a switch, with offline caching.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TÊŞTA DADÊ ARCHITECTURE                         │
└────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐         ┌──────────────────────────┐
    │   Customer View (Public) │         │ Dedicated Admin (#admin) │
    │   • Clean Menu Grid      │         │   • Hash Auth Gate       │
    │   • Dynamic Sections     │         │   • Dishes Reorder / Pin │
    │   • Pinned Items First   │         │   • Device Photo Upload  │
    │   • Phone/WhatsApp Call  │         │   • Sections Toggle      │
    └────────────┬─────────────┘         └────────────┬─────────────┘
                 │                                    │
                 ▼                                    ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                       State Controller                        │
    │  • AppSettings (sections, brand, salt/hash, phone)            │
    │  • Dishes Store (sorted by: isPinned desc, order asc, id)     │
    │  • Image Compression Engine (Canvas resize & base64 / blob)   │
    │  • Crypto Auth Module (Web Crypto SHA-256 + Salt)             │
    └──────────────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
    ┌───────────────────────────────────────────────────────────────┐
    │             Firebase Cloud Firestore (europe-west2)            │
    │  • Project ID: cool-synthesizer-rkx2q                         │
    │  • Collection: /dishes/{dishId}                               │
    │  • Document:   /settings/app                                  │
    └───────────────────────────────────────────────────────────────┘
```

### Data Model Updates:
- **`Dish`**:
  ```ts
  interface Dish {
    id: number;
    name: string;
    price: string;
    desc: string;
    cat: string;
    img: string;
    isPopular?: boolean;
    available?: boolean;
    isPinned?: boolean;   // New: Pin item to top of menu
    order?: number;       // New: Display sort position
  }
  ```
- **`AppSettings`**:
  ```ts
  interface AppSettings {
    brandName?: string;
    subtitle?: string;
    restaurantPhone?: string;
    whatsappPhone?: string;
    isOpen?: boolean;
    announcement?: string;
    showAnnouncement?: boolean;
    categoriesState?: CategoryState;
    adminPasswordHash?: string; // New: SHA-256 salted hash
    adminPasswordSalt?: string; // New: Unique cryptographic salt
    homepageSections?: {        // New: Dynamic sections control
      showFeaturedSlider: boolean;
      showCategoriesBar: boolean;
      showAnnouncement: boolean;
      showContactBox: boolean;
      showFooter: boolean;
    };
  }
  ```

---

## 5. Phased Implementation Plan

1. **Step 1: Security & Auth Module (`src/services/auth.ts`)**
   - Implement Web Crypto SHA-256 hashing with salt.
   - Implement password verification against Firestore stored hash.
   - Implement password change function generating new salt + hash.
   - Update `AdminLoginModal.tsx` to use the cryptographic verification.

2. **Step 2: Schema & Firestore Rules Updates**
   - Update `firebase-blueprint.json` with `isPinned`, `order`, `adminPasswordHash`, `adminPasswordSalt`, and `homepageSections`.
   - Update `firestore.rules` to allow the new fields and deploy via `DeployRules`.

3. **Step 3: Device Image Upload Utility (`src/utils/imageUpload.ts`)**
   - Implement file reader with image dimension normalization and Canvas JPEG compression.
   - Add drag-and-drop and native `<input type="file" accept="image/*">` into `EditDishModal.tsx`.
   - Live preview with file size info and option to revert or use presets.

4. **Step 4: Post Priority Ordering & Pinning Controls**
   - In `AdminDashboard.tsx`, add Pin-to-top toggle button and position adjustment controls (move up, move down, set order number).
   - In `App.tsx`, implement sorting algorithm: pinned items first, then priority order, then default sequence.

5. **Step 5: Homepage Sections Manager**
   - In `AdminDashboard.tsx`, add a "Homepage Sections" control tab with visual toggles.
   - In `App.tsx`, conditionally render the Featured Slider, Categories Bar, Announcement Banner, and Contact box based on Firestore settings.

6. **Step 6: Featured Slider Component (`src/components/FeaturedSlider.tsx`)**
   - Add an optional top swipeable/scrollable slider for pinned and featured dishes.

7. **Step 7: Verification & Testing**
   - Run linter and compilation checks.
   - Test password verification, dish reordering, section toggling, and image upload.
