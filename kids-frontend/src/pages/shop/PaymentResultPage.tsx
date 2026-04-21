import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function PaymentResultPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status');
  const orderId = searchParams.get('order_id');

  const isSuccess = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-6 py-12"
        >
          {isSuccess && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-14 h-14 text-green-500" />
              </motion.div>
              <h1 className="text-3xl font-extrabold text-green-600 mb-2">{t('shop.result.success')}</h1>
              <p className="text-muted-foreground mb-2">
                {t('shop.result.successDesc')}
              </p>
              {orderId && (
                <p className="text-sm text-muted-foreground mb-6">
                  {t('shop.result.orderId', { id: orderId.slice(0, 8).toUpperCase() })}
                </p>
              )}
              <div className="flex justify-center mb-6">
                <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
              </div>
            </>
          )}

          {isFailed && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="w-14 h-14 text-red-500" />
              </motion.div>
              <h1 className="text-3xl font-extrabold text-red-600 mb-2">{t('shop.result.failed')}</h1>
              <p className="text-muted-foreground mb-6">
                {t('shop.result.failedDesc')}
              </p>
              <div className="flex justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </>
          )}

          {!isSuccess && !isFailed && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertCircle className="w-14 h-14 text-yellow-500" />
              </motion.div>
              <h1 className="text-3xl font-extrabold mb-2">{t('shop.result.unknown')}</h1>
              <p className="text-muted-foreground mb-6">
                {t('shop.result.unknownDesc')}
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <Button variant="hero" size="lg" onClick={() => navigate('/shop')}>
              {t('shop.result.backToShop')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              {t('shop.result.goHome')}
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
