'use client'

import * as React from 'react'

// ── Supported languages ────────────────────────────────────────────────────────
export type Language = 'en' | 'fil' | 'ceb'

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
  { code: 'ceb', label: 'Cebuano', flag: '🇵🇭' },
]

// ── Translation dictionary ─────────────────────────────────────────────────────
type TranslationKey = keyof typeof en

const en = {
  // Navigation
  dashboard: 'Dashboard',
  browse: 'Browse Catalog',
  borrowed: 'Borrowed Books',
  requests: 'My Requests',
  settings: 'Settings',
  logout: 'Sign Out',
  notificationsNav: 'Notifications',
  chat: 'Ask Libby AI',

  // Dashboard
  welcomeBack: 'Welcome back',
  browseBtn: 'Browse Catalog',
  libbyBtn: 'Ask Libby AI',
  booksBorrowed: 'Books Borrowed',
  currentlyActive: 'Currently Active',
  booksReturned: 'Books Returned',
  overdueBooks: 'Overdue Books',
  borrowingCapacity: 'Borrowing Capacity',
  slotsUsed: 'slots used',
  limitReached: 'Limit Reached',
  available: 'available',
  currentlyBorrowed: 'Currently Borrowed',
  viewAll: 'View All',
  dueDate: 'Due',
  overdue: 'OVERDUE',
  dueSoon: 'DUE SOON',
  newBooks: 'New Arrivals',
  bookOfMonth: 'Book of the Month',
  featuredBooks: 'Featured Books',
  viewDetails: 'View Details',
  noActiveBorrows: 'You have no active borrowed books.',

  // Browse
  libraryCatalog: 'Library Catalog',
  searchPlaceholder: 'Search by book title or author...',
  availableOnly: 'Available Only',
  allGenres: 'All Genres',
  requestToBorrow: 'Request to Borrow',
  notifyRequest: 'Notify & Request a Copy',
  borrowLimitReached: 'Borrowing Limit Reached',
  activeBorrows: 'Active Borrows',

  // Alerts
  overdueAlert: 'You have overdue books!',
  overdueMsg: 'Please return them immediately to avoid penalties.',
  dueSoonAlert: 'You have books due soon!',
  dueSoonMsg: 'Check your borrowed books and prepare to return them on time.',

  // Settings
  settingsTitle: 'Settings',
  appearance: 'Appearance',
  notificationsSettings: 'Notifications',
  language: 'Language',
  selectLanguage: 'Select Language',
  libraryRules: 'Library Rules',
  defaultBorrowLimit: 'Default Borrowing Limit',
  saveLimit: 'Save Limit',

  // Common
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  loading: 'Loading...',
  noResults: 'No results found.',
  error: 'An error occurred.',
  success: 'Success!',
  viewOverdueBooks: 'View overdue books',
  viewBorrowedBooks: 'View borrowed books',
}

const fil: typeof en = {
  // Navigation
  dashboard: 'Dashboard',
  browse: 'I-browse ang Katalogo',
  borrowed: 'Mga Hinahiraming Libro',
  requests: 'Aking mga Kahilingan',
  settings: 'Mga Setting',
  logout: 'Mag-sign Out',
  notificationsNav: 'Mga Abiso',
  chat: 'Tanong si Libby AI',

  // Dashboard
  welcomeBack: 'Maligayang pagbabalik',
  browseBtn: 'I-browse ang Katalogo',
  libbyBtn: 'Tanong si Libby AI',
  booksBorrowed: 'Mga Librong Hiniram',
  currentlyActive: 'Kasalukuyang Aktibo',
  booksReturned: 'Mga Librong Ibinalik',
  overdueBooks: 'Mga Nalumanpas na Libro',
  borrowingCapacity: 'Kapasidad sa Paghiram',
  slotsUsed: 'slot ang nagamit',
  limitReached: 'Naabot na ang Limitasyon',
  available: 'available',
  currentlyBorrowed: 'Kasalukuyang Hiniram',
  viewAll: 'Tingnan Lahat',
  dueDate: 'Takda',
  overdue: 'NALUMANPAS NA',
  dueSoon: 'MALAPIT NA ANG TAKDA',
  newBooks: 'Mga Bagong Dating',
  bookOfMonth: 'Libro ng Buwan',
  featuredBooks: 'Mga Itinatampok na Libro',
  viewDetails: 'Tingnan ang Detalye',
  noActiveBorrows: 'Wala kang aktibong hinahiraming libro.',

  // Browse
  libraryCatalog: 'Katalogo ng Aklatan',
  searchPlaceholder: 'Maghanap ng pamagat o may-akda...',
  availableOnly: 'Available Lang',
  allGenres: 'Lahat ng Genre',
  requestToBorrow: 'Humiling na Manghiram',
  notifyRequest: 'Ipaalam at Humiling ng Kopya',
  borrowLimitReached: 'Naabot ang Limitasyon sa Paghiram',
  activeBorrows: 'Mga Aktibong Hiram',

  // Alerts
  overdueAlert: 'Mayroon kang mga nalumanpas na libro!',
  overdueMsg: 'Mangyaring ibalik na agad upang maiwasan ang multa.',
  dueSoonAlert: 'Malapit nang lumipas ang takda ng ilang libro!',
  dueSoonMsg: 'Suriin ang iyong mga hinahiraming libro at maghanda sa pagbabalik.',

  // Settings
  settingsTitle: 'Mga Setting',
  appearance: 'Hitsura',
  notificationsSettings: 'Mga Abiso',
  language: 'Wika',
  selectLanguage: 'Pumili ng Wika',
  libraryRules: 'Patakaran ng Aklatan',
  defaultBorrowLimit: 'Default na Limitasyon sa Paghiram',
  saveLimit: 'I-save ang Limitasyon',

  // Common
  save: 'I-save',
  cancel: 'Kanselahin',
  confirm: 'Kumpirmahin',
  loading: 'Naglo-load...',
  noResults: 'Walang nahanap.',
  error: 'May naganap na error.',
  success: 'Matagumpay!',
  viewOverdueBooks: 'Tingnan ang mga nalumanpas na libro',
  viewBorrowedBooks: 'Tingnan ang mga hinahiraming libro',
}

const ceb: typeof en = {
  // Navigation
  dashboard: 'Dashboard',
  browse: 'I-browse ang Katalogo',
  borrowed: 'Mga Gipahulam nga Libro',
  requests: 'Akong mga Hangyo',
  settings: 'Mga Setting',
  logout: 'Mag-sign Out',
  notificationsNav: 'Mga Pahibalo',
  chat: 'Pangutan-a si Libby AI',

  // Dashboard
  welcomeBack: 'Maayong pag-balik',
  browseBtn: 'I-browse ang Katalogo',
  libbyBtn: 'Pangutan-a si Libby AI',
  booksBorrowed: 'Mga Libro nga Gipahulam',
  currentlyActive: 'Karon nga Aktibo',
  booksReturned: 'Mga Libro nga Gibalik',
  overdueBooks: 'Mga Libro nga Nalapas',
  borrowingCapacity: 'Kapasidad sa Paghulam',
  slotsUsed: 'slot ang gigamit',
  limitReached: 'Nakaabot na sa Limitasyon',
  available: 'available',
  currentlyBorrowed: 'Karon nga Gipahulam',
  viewAll: 'Tan-awa Tanan',
  dueDate: 'Takna',
  overdue: 'NALAPAS NA',
  dueSoon: 'HAPIT NA ANG TAKNA',
  newBooks: 'Bag-ong Pag-abot',
  bookOfMonth: 'Libro sa Buwan',
  featuredBooks: 'Mga Gipasigarbo nga Libro',
  viewDetails: 'Tan-awa ang Detalye',
  noActiveBorrows: 'Wala kay aktibong gipahulam nga libro.',

  // Browse
  libraryCatalog: 'Katalogo sa Librarya',
  searchPlaceholder: 'Mangita sa titulo o tagsulat...',
  availableOnly: 'Available Lang',
  allGenres: 'Tanan nga Genre',
  requestToBorrow: 'Mangayo sa Paghulam',
  notifyRequest: 'Ipasabot ug Mangayo og Kopya',
  borrowLimitReached: 'Naabot ang Limitasyon sa Paghulam',
  activeBorrows: 'Mga Aktibong Pahulam',

  // Alerts
  overdueAlert: 'Adunay libro nga nalapas na ang takna!',
  overdueMsg: 'Palihug ibalik na dayon aron malikayan ang multa.',
  dueSoonAlert: 'Hapit na ang takna sa ubang libro!',
  dueSoonMsg: 'I-check ang imong gipahulam nga libro ug pag-andam sa pagbalik.',

  // Settings
  settingsTitle: 'Mga Setting',
  appearance: 'Hitsura',
  notificationsSettings: 'Mga Pahibalo',
  language: 'Pinulongan',
  selectLanguage: 'Pilia ang Pinulongan',
  libraryRules: 'Balaod sa Librarya',
  defaultBorrowLimit: 'Default nga Limitasyon sa Paghulam',
  saveLimit: 'I-save ang Limitasyon',

  // Common
  save: 'I-save',
  cancel: 'Kanselahon',
  confirm: 'Kumpirmahon',
  loading: 'Nagkarga...',
  noResults: 'Walay nakit-an.',
  error: 'Adunay nahitabong sayop.',
  success: 'Malamposun!',
  viewOverdueBooks: 'Tan-awa ang mga nalapas na libro',
  viewBorrowedBooks: 'Tan-awa ang mga gipahulam nga libro',
}

const translations: Record<Language, typeof en> = { en, fil, ceb }

// ── Context ────────────────────────────────────────────────────────────────────
type LanguageContextType = {
  lang: Language
  setLang: (l: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = React.createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => en[key] ?? key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Language>('en')

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('schoollib_lang') as Language | null
      if (stored && ['en', 'fil', 'ceb'].includes(stored)) {
        setLangState(stored)
      }
    } catch { /* SSR safety */ }
  }, [])

  function setLang(l: Language) {
    setLangState(l)
    try {
      localStorage.setItem('schoollib_lang', l)
    } catch { /* ignore */ }
  }

  function t(key: TranslationKey): string {
    return translations[lang][key] ?? en[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return React.useContext(LanguageContext)
}
