import { getApps, initializeApp, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Dish, AppSettings } from '../types';

// Ensure Firebase is initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider with required Drive and Sheets scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize auth listener. Access token is cached in memory only.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to get an access token for Drive and Sheets
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const isGoogleAuthenticated = (): boolean => {
  return Boolean(cachedAccessToken && auth.currentUser);
};

// ============================================================
// GOOGLE DRIVE API INTEGRATION
// ============================================================

/**
 * Convert a Google Drive File ID into direct embedding image links
 */
export function getDriveDirectImageUrl(fileId: string): string {
  // Direct CDN format that renders cleanly in <img> tags without auth/cors restrictions
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Upload a local image file directly to Google Drive and make it publicly readable
 */
export async function uploadImageToGoogleDrive(
  file: File,
  customName?: string
): Promise<{ fileId: string; webViewLink: string; directUrl: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('تکایە سەرەتا بە هەژماری گووگڵ (Sign in with Google) بچۆ ژوورەوە بۆ بارکردنی وێنەکان لە گووگڵ درایڤ.');
  }

  const fileName = customName || `dade_breakfast_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 1. Prepare Multipart Upload for Google Drive v3
  const metadata = {
    name: fileName,
    mimeType: file.type || 'image/jpeg',
    description: 'Food item photo for Têşta Dadê Digital Menu'
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const arrayBuffer = await fileDataPromise;
  const uint8Array = new Uint8Array(arrayBuffer);

  const multipartHeader = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}${delimiter}Content-Type: ${file.type || 'image/jpeg'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Convert binary data to base64
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64Data = btoa(binary);

  const multipartBody = `${multipartHeader}${base64Data}${closeDelimiter}`;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errorText}`);
  }

  const uploadJson = await uploadRes.json();
  const fileId = uploadJson.id;

  // 2. Set file permission to 'anyone: reader' so menu customers can view the dish image
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Could not set public permission on Drive file:', permErr);
  }

  const directUrl = getDriveDirectImageUrl(fileId);

  return {
    fileId,
    webViewLink: uploadJson.webViewLink || directUrl,
    directUrl
  };
}

// ============================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================

const DEFAULT_SHEET_TITLE = 'تێشتا دادی - مینیۆی خواردن و ڕێکخستنەکان';

/**
 * Creates a brand new Google Spreadsheet configured with tabs for Dishes, Settings, and Orders
 */
export async function createMenuSpreadsheet(title = DEFAULT_SHEET_TITLE): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('تکایە پێشتر لەگەڵ گووگڵ پەیوەست بە بۆ دروستکردنی فایلی سپریدشیت.');
  }

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title,
        locale: 'ku',
        timeZone: 'Asia/Baghdad'
      },
      sheets: [
        {
          properties: {
            title: 'Food Items',
            gridProperties: { rowCount: 100, columnCount: 10 }
          }
        },
        {
          properties: {
            title: 'App Settings',
            gridProperties: { rowCount: 30, columnCount: 2 }
          }
        },
        {
          properties: {
            title: 'Customer Orders',
            gridProperties: { rowCount: 200, columnCount: 6 }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write Initial Headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Food Items!A1:J1',
            values: [
              [
                'ID',
                'Name (ناڤێ خوارنێ)',
                'Price (بها)',
                'Category (پۆلێن)',
                'Description (وەسف)',
                'Image URL (لینکێ وێنەی)',
                'Is Popular (تایبەت)',
                'Available (بەردەستە)',
                'Is Pinned (پێشەنگ)',
                'Order Priority (ڕیزبەندی)'
              ]
            ]
          },
          {
            range: 'App Settings!A1:B1',
            values: [['Setting Key', 'Setting Value']]
          },
          {
            range: 'Customer Orders!A1:F1',
            values: [
              ['Date & Time (دەمژمێر)', 'Customer Phone (تەلەفۆن)', 'Dish Name (ناوی خواردن)', 'Quantity (ژمارە)', 'Price (نرخ)', 'Notes (تێبینی)']
            ]
          }
        ]
      })
    }
  );

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Sync entire dishes list and app settings to a Google Sheet
 */
export async function syncDishesToGoogleSheets(
  spreadsheetId: string,
  dishes: Dish[],
  settings: AppSettings
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Access token not found. Please sign in with Google.');

  // Prepare Food Items rows
  const dishRows = dishes.map((d) => [
    d.id,
    d.name,
    d.price,
    d.cat,
    d.desc,
    d.img || '',
    d.isPopular ? 'TRUE' : 'FALSE',
    d.available !== false ? 'TRUE' : 'FALSE',
    d.isPinned ? 'TRUE' : 'FALSE',
    d.order ?? 0
  ]);

  // Settings rows
  const settingsRows = [
    ['brandName', settings.brandName || 'تێشتا دادی'],
    ['subtitle', settings.subtitle || 'تامێ خۆشیا خوارنێن سرۆشتی و کەلتووری'],
    ['restaurantPhone', settings.restaurantPhone || '+964 751 549 3953'],
    ['whatsappPhone', settings.whatsappPhone || '9647515493953'],
    ['isOpen', settings.isOpen !== false ? 'TRUE' : 'FALSE'],
    ['announcement', settings.announcement || ''],
    ['showAnnouncement', settings.showAnnouncement ? 'TRUE' : 'FALSE'],
    ['mapsUrl', settings.mapsUrl || 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7'],
    ['showFeaturedSlider', settings.homepageSections?.showFeaturedSlider ? 'TRUE' : 'FALSE'],
    ['showCategoriesBar', settings.homepageSections?.showCategoriesBar ? 'TRUE' : 'FALSE'],
    ['showLocationSection', settings.homepageSections?.showLocationSection ? 'TRUE' : 'FALSE'],
    ['lastSyncedAt', new Date().toISOString()]
  ];

  // 1. Clear old values in Food Items range
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Food Items!A2:J100:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  // 2. Batch update both sheets
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Food Items!A2',
            values: dishRows
          },
          {
            range: 'App Settings!A2',
            values: settingsRows
          }
        ]
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Sheets update failed: ${errText}`);
  }
}

/**
 * Load dishes and settings directly from Google Sheets
 */
export async function loadDishesFromGoogleSheets(
  spreadsheetId: string
): Promise<{ dishes: Dish[]; settings: Partial<AppSettings> }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Access token not found. Please sign in with Google.');

  // Fetch both ranges
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Food%20Items!A2:J100&ranges=App%20Settings!A2:B30`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to load data from Google Sheets: ${err}`);
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const dishValues = valueRanges[0]?.values || [];
  const settingsValues = valueRanges[1]?.values || [];

  const loadedDishes: Dish[] = dishValues
    .filter((row: any[]) => row && row[1]) // Must have at least a name
    .map((row: any[], index: number) => {
      const id = parseInt(row[0]) || index + 1;
      const name = String(row[1] || '').trim();
      const price = String(row[2] || '').trim();
      const cat = String(row[3] || 'germ').trim();
      const desc = String(row[4] || '').trim();
      const img = String(row[5] || '').trim();
      const isPopular = String(row[6]).toUpperCase() === 'TRUE';
      const available = String(row[7]).toUpperCase() !== 'FALSE';
      const isPinned = String(row[8]).toUpperCase() === 'TRUE';
      const order = parseInt(row[9]) || index;

      return {
        id,
        name,
        price,
        cat,
        desc,
        img,
        isPopular,
        available,
        isPinned,
        order
      };
    });

  const parsedSettings: Partial<AppSettings> = {};
  settingsValues.forEach((row: any[]) => {
    if (!row || row.length < 2) return;
    const key = String(row[0]).trim();
    const val = String(row[1]).trim();

    if (key === 'brandName') parsedSettings.brandName = val;
    if (key === 'subtitle') parsedSettings.subtitle = val;
    if (key === 'restaurantPhone') parsedSettings.restaurantPhone = val;
    if (key === 'whatsappPhone') parsedSettings.whatsappPhone = val;
    if (key === 'isOpen') parsedSettings.isOpen = val.toUpperCase() === 'TRUE';
    if (key === 'announcement') parsedSettings.announcement = val;
    if (key === 'showAnnouncement') parsedSettings.showAnnouncement = val.toUpperCase() === 'TRUE';
    if (key === 'mapsUrl') parsedSettings.mapsUrl = val;
  });

  return { dishes: loadedDishes, settings: parsedSettings };
}

/**
 * Log customer order inquiries into the connected Google Sheet
 */
export async function logOrderToGoogleSheets(
  spreadsheetId: string,
  dishName: string,
  price: string,
  customerPhone?: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token || !spreadsheetId) return;

  try {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Baghdad' });
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Customer%20Orders!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[timestamp, customerPhone || 'WhatsApp Inquire', dishName, '1', price, 'Web Menu Order']]
        })
      }
    );
  } catch (err) {
    console.warn('Failed to append order to Google Sheet:', err);
  }
}
