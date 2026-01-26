import { motion } from 'framer-motion';

const elements = [
  { emoji: '⭐', size: 'text-2xl', delay: 0, x: '10%', y: '20%' },
  { emoji: '🌈', size: 'text-3xl', delay: 0.5, x: '85%', y: '15%' },
  { emoji: '🎨', size: 'text-2xl', delay: 1, x: '5%', y: '60%' },
  { emoji: '📚', size: 'text-2xl', delay: 1.5, x: '90%', y: '55%' },
  { emoji: '🎮', size: 'text-3xl', delay: 2, x: '15%', y: '80%' },
  { emoji: '🎵', size: 'text-2xl', delay: 2.5, x: '80%', y: '80%' },
  { emoji: '🦋', size: 'text-2xl', delay: 0.3, x: '50%', y: '10%' },
  { emoji: '🌸', size: 'text-xl', delay: 0.8, x: '25%', y: '45%' },
  { emoji: '🎈', size: 'text-3xl', delay: 1.3, x: '70%', y: '35%' },
];

export function FloatingElements() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {elements.map((el, index) => (
        <motion.div
          key={index}
          className={`absolute ${el.size}`}
          style={{ left: el.x, top: el.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 0.6, 
            scale: 1,
            y: [0, -20, 0],
          }}
          transition={{
            delay: el.delay,
            duration: 0.5,
            y: {
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {el.emoji}
        </motion.div>
      ))}
    </div>
  );
}
