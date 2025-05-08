import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Dil algılama özelliğini ekle
  .use(LanguageDetector)
  // Sunucu tarafı yükleme için arka uç ekle
  .use(Backend)
  // i18next örneğini react-i18next'e ilet
  .use(initReactI18next)
  // i18next'i başlat
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV, // Sadece geliştirme ortamında hata ayıklama etkinleştir

    interpolation: {
      escapeValue: false, // React varsayılan olarak kaçırdığı için gerekli değil
    },

    // Herkese açık klasörden çevirileri yükle
    // public/locales/{lng}/translation.json dosyalarını kullanacak
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Dil algılayıcı ayarları
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n; 