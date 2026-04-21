import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const currentLang = i18n.language === 'vi' ? 'VI' : 'EN';

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full gap-2 px-3 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden h-9"
      onClick={toggleLanguage}
    >
      <motion.div
        animate={{ rotate: i18n.language === 'vi' ? 360 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <Globe className="w-4 h-4 text-primary" />
      </motion.div>
      
      <div className="flex flex-col items-start leading-none overflow-hidden h-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentLang}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            className="font-bold text-xs text-primary min-w-[20px]"
          >
            {currentLang}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Subtle shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
      />
    </Button>
  );
}
