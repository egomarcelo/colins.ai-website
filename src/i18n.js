// i18n.js - Internationalization System with Geolocation

class I18n {
  constructor() {
    // IMPORTANT: Define supportedLanguages BEFORE calling detectLanguage
    this.supportedLanguages = ['en', 'es', 'de', 'fr', 'it', 'pt'];
    this.translations = {};
    this.fallbackLanguage = 'en';
    
    // Map countries to languages
    this.countryToLanguage = {
      'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
      'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es', 'VE': 'es',
      'DE': 'de', 'AT': 'de', 'CH': 'de',
      'FR': 'fr', 'BE': 'fr', 'LU': 'fr',
      'IT': 'it',
      'PT': 'pt', 'BR': 'pt'
    };
    
    // Will be set after async detection
    this.currentLanguage = null;
    this.detectionComplete = false;
  }

  // Detect user's country using IP geolocation
  async detectUserCountry() {
    try {
      // Using ipapi.co - free, no API key needed
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 3000 // 3 second timeout
      });
      
      if (!response.ok) throw new Error('Geolocation API failed');
      
      const data = await response.json();
      return data.country_code; // Returns 2-letter country code like 'US', 'MX', 'DE'
    } catch (error) {
      console.warn('Geolocation detection failed:', error);
      return null;
    }
  }

  // Get language from country code
  getLanguageFromCountry(countryCode) {
    return this.countryToLanguage[countryCode] || null;
  }

  // Detect language with priority: saved preference > geolocation > browser > default
  async detectLanguage() {
    // Priority 1: Check if user has a saved preference (they've manually selected a language)
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      return savedLanguage;
    }

    // Priority 2: Use geolocation to detect user's country
    const countryCode = await this.detectUserCountry();
    if (countryCode) {
      const geoLanguage = this.getLanguageFromCountry(countryCode);
      if (geoLanguage && this.isLanguageSupported(geoLanguage)) {
        return geoLanguage;
      }
    }

    // Priority 3: Check browser language
    const browserLanguage = navigator.language.split('-')[0];
    if (this.isLanguageSupported(browserLanguage)) {
      return browserLanguage;
    }

    // Priority 4: Default to English
    return 'en';
  }

  isLanguageSupported(lang) {
    return this.supportedLanguages.includes(lang);
  }

  // Load translation file for a specific language
  async loadTranslations(language) {
    try {
      // Use dynamic import for Vite to properly handle JSON files
      const translationModule = await import(`./translations/${language}.json`);
      const data = translationModule.default;
      
      this.translations[language] = data;
      return data;
    } catch (error) {
      console.error(`Error loading translations for ${language}:`, error);
      console.error(`Make sure ${language}.json exists in src/translations/ directory`);
      
      // Load fallback language if primary fails
      if (language !== this.fallbackLanguage) {
        return this.loadTranslations(this.fallbackLanguage);
      }
      return {};
    }
  }

  // Get translation for a key
  t(key, language = this.currentLanguage) {
    const keys = key.split('.');
    let value = this.translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        if (language !== this.fallbackLanguage) {
          return this.t(key, this.fallbackLanguage);
        }
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }
    }

    return value || key;
  }

  // Change language and update the page
  async changeLanguage(language) {
    if (!this.isLanguageSupported(language)) {
      console.error(`Language ${language} is not supported`);
      return;
    }

    this.currentLanguage = language;
    localStorage.setItem('preferredLanguage', language);

    // Load translations if not already loaded
    if (!this.translations[language]) {
      await this.loadTranslations(language);
    }

    // Update all elements with data-i18n attribute
    this.updatePageTranslations();
    
    // Update language selector to show current language
    this.updateLanguageSelector();

    // Dispatch custom event for other components to react
    document.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language } 
    }));
  }

  // Update all translatable elements on the page
  updatePageTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update elements with data-i18n-html attribute (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      element.innerHTML = this.t(key);
    });

    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });

    // Update meta tags
    this.updateMetaTags();
  }

  // Update language selector dropdown to show current language
  updateLanguageSelector() {
    const languageNames = {
      en: 'English',
      es: 'Español',
      de: 'Deutsch',
      fr: 'Français',
      it: 'Italiano',
      pt: 'Português'
    };

    // Update current language display in the dropdown button
    const currentLangElements = document.querySelectorAll('[data-current-language]');
    currentLangElements.forEach(element => {
      element.textContent = languageNames[this.currentLanguage] || 'English';
    });

    // Update active state in dropdown options
    document.querySelectorAll('[data-language-option]').forEach(option => {
      const lang = option.getAttribute('data-language-option');
      if (lang === this.currentLanguage) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  // Update meta tags for SEO
  updateMetaTags() {
    const lang = this.currentLanguage;
    document.documentElement.lang = lang;
    
    // Update meta description if translation exists
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      const descKey = 'meta.description';
      const translation = this.t(descKey);
      if (translation !== descKey) {
        metaDescription.content = translation;
      }
    }

    // Update page title if translation exists
    const titleKey = 'meta.title';
    const titleTranslation = this.t(titleKey);
    if (titleTranslation !== titleKey) {
      document.title = titleTranslation;
    }
  }

  // Initialize i18n system
  async init() {
    // Detect language (async - uses geolocation)
    this.currentLanguage = await this.detectLanguage();
    this.detectionComplete = true;
    
    // Load translations for current language
    await this.loadTranslations(this.currentLanguage);
    
    // Update page with translations
    this.updatePageTranslations();
    
    // CRITICAL: Update language selector on page load to show current language
    this.updateLanguageSelector();

    // Set up language switcher event listeners
    this.setupLanguageSwitcher();

    // Dispatch event so components know translations are ready
    document.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: this.currentLanguage } 
    }));
  }

  // Setup event listeners for language switcher
  setupLanguageSwitcher() {
    document.querySelectorAll('[data-language-option]').forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        const language = option.getAttribute('data-language-option');
        this.changeLanguage(language);
      });
    });
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get language name
  getLanguageName(lang = this.currentLanguage) {
    const names = {
      en: 'English',
      es: 'Español',
      de: 'Deutsch',
      fr: 'Français',
      it: 'Italiano',
      pt: 'Português'
    };
    return names[lang] || 'English';
  }
}

// Create global i18n instance
const i18n = new I18n();

// Export for use in other modules
export default i18n;

// Also make it available globally
window.i18n = i18n;