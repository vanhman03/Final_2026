import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Gamepad2, Shield, Star, Users, Clock, ChevronRight, Trophy, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { FloatingElements } from '@/components/FloatingElements';
import heroImage from '@/assets/hero-kids.png';

const features = [
  {
    icon: Play,
    title: 'Safe Videos',
    description: 'Curated YouTube content filtered for children, no ads or distractions.',
    color: 'bg-primary',
  },
  {
    icon: Gamepad2,
    title: 'Fun Games',
    description: 'Educational mini-games that make learning exciting and rewarding.',
    color: 'bg-secondary',
  },
  {
    icon: Shield,
    title: 'Parental Control',
    description: 'Full control over content access and screen time limits.',
    color: 'bg-success',
  },
  {
    icon: Star,
    title: 'Rewards System',
    description: 'Points and badges that motivate kids to learn more.',
    color: 'bg-accent',
  },
];

const stats = [
  { value: '500+', label: 'Educational Videos' },
  { value: '20+', label: 'Fun Games' },
  { value: '10K+', label: 'Happy Families' },
  { value: '99%', label: 'Parents Trust Us' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <Layout>
      <FloatingElements />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6"
              >
                <Star className="w-4 h-4" />
                <span>Learning Made Fun!</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Where Kids{' '}
                <span className="text-primary">Learn & Play</span>
                {' '}Safely
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0">
                A magical world of educational videos, fun games, and rewarding experiences designed for children aged 3-12.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                    Start Learning Free
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto">
                    Parent Login
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-6 mt-10 justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium">100% Safe</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Family Friendly</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-5 h-5 text-secondary" />
                  <span className="text-sm font-medium">Screen Time Control</span>
                </div>
              </motion.div>
            </motion.div>
            
            {/* Right - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={heroImage}
                  alt="Happy children learning together"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              
              {/* Floating cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 -left-6 bg-card p-4 rounded-2xl shadow-card hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center text-success">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold">450 Points</p>
                    <p className="text-sm text-muted-foreground">Keep Learning!</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute -top-4 -right-4 bg-card p-4 rounded-2xl shadow-card hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-2xl">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold">5 Games</p>
                    <p className="text-sm text-muted-foreground">Completed Today</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-extrabold text-primary mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Everything Kids Need to{' '}
              <span className="text-secondary">Learn & Grow</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete educational platform designed with love for children and peace of mind for parents.
            </p>
          </motion.div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="bg-card p-6 rounded-3xl shadow-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-dots bg-[length:20px_20px] opacity-10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-4">
              Ready to Start the Learning Adventure?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join thousands of families who trust EduKids for their children's education.
            </p>
            <Link to="/register">
              <Button variant="bubble" size="xl" className="shadow-lg hover:shadow-xl">
                Create Free Account
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Star className="text-3xl text-primary fill-current" />
              <span className="font-extrabold text-2xl text-primary">EduKids</span>
            </div>
            <p className="text-muted-foreground text-center flex items-center gap-1 justify-center">
              © 2024 EduKids. Made with <Heart className="w-4 h-4 text-rose-500 fill-current" /> for children everywhere.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
              <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </Layout>
  );
}
