import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

export default function PaymentResultPage() {
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
              <h1 className="text-3xl font-extrabold text-green-600 mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground mb-2">
                Your order has been confirmed and is being processed.
              </p>
              {orderId && (
                <p className="text-sm text-muted-foreground mb-6">
                  Order ID: <span className="font-mono font-semibold">{orderId.slice(0, 8).toUpperCase()}</span>
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
              <h1 className="text-3xl font-extrabold text-red-600 mb-2">Payment Failed</h1>
              <p className="text-muted-foreground mb-6">
                Your payment could not be processed. Please try again or contact support.
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
              <h1 className="text-3xl font-extrabold mb-2">Unknown Result</h1>
              <p className="text-muted-foreground mb-6">
                We couldn't confirm your payment status. Check your orders for details.
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <Button variant="hero" size="lg" onClick={() => navigate('/shop')}>
              Back to Shop
            </Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              Go to Home
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
