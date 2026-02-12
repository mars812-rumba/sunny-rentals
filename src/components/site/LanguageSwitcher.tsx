
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'ru' ? 'en' : 'ru';
    setLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="absolute top-4 right-4 bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-md shadow-lg z-50 flex items-center space-x-2"
    >
      {language === 'ru' ? (
        <>
          <span role="img" aria-label="United Kingdom Flag">🇬🇧</span>
          <span>EN</span>
        </>
      ) : (
        <>
          <span role="img" aria-label="Russian Flag">🇷🇺</span>
          <span>RU</span>
        </>
      )}
    </button>
  );
};

export default LanguageSwitcher;
