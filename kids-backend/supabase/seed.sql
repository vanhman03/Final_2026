-- Development Seed Data
-- Provides sample data for testing and development

-- Note: Run this with `supabase db reset` to populate fresh database

-- Sample Videos (Educational Content)
INSERT INTO public.videos (youtube_video_id, title, thumbnail_emoji, category, age_group, duration, language) VALUES
  ('dQw4w9WgXcQ', 'ABC Song for Kids', '🔤', 'Alphabet', '3-5', '3:32', 'en'),
  ('9bZkp7q19f0', 'Counting 1 to 20', '🔢', 'Numbers', '3-5', '4:15', 'en'),
  ('tVlcWAL3b8k', 'Learn Colors with Shapes', '🎨', 'Colors', '3-5', '5:20', 'en'),
  ('kffacxfA7G4', 'Animal Sounds Song', '🦁', 'Animals', '3-6', '6:10', 'en'),
  ('7PCkvCPvDXk', 'Solar System for Kids', '🌍', 'Science', '6-8', '8:45', 'en'),
  ('EH1n7TpRhV4', 'Simple Addition', '➕', 'Math', '5-7', '5:30', 'en'),
  ('KcRuhfgZl5I', 'Shapes and Patterns', '⭐', 'Math', '4-6', '4:50', 'en'),
  ('Tgym5bOK4Ns', 'Days of the Week Song', '📅', 'Time', '4-6', '3:15', 'en'),
  ('2SmoBvg-etU', 'The Water Cycle', '💧', 'Science', '7-9', '7:20', 'en'),
  ('LtEFvgWOrYw', 'Basic Phonics', '📚', 'Reading', '5-7', '6:00', 'en'),
  ('Mg_cV6S5Gr8', 'Fruit and Vegetables', '🍎', 'Health', '4-6', '4:30', 'en'),
  ('PHFf5wc7Fxo', 'Transportation Vehicles', '🚗', 'Vehicles', '3-5', '5:45', 'en'),
  ('3fv0OtJsGCU', 'Seasons of the Year', '🌸', 'Nature', '5-7', '5:10', 'en'),
  ('LQC2bU0VqGM', 'Body Parts Song', '👋', 'Body', '3-5', '3:50', 'en'),
  ('mjTEKzkZ4Ao', 'Weather and Climate', '☀️', 'Science', '6-8', '6:30', 'en'),
  ('S28s0g78_EE', 'Dinosaurs for Kids', '🦕', 'History', '5-8', '8:15', 'en'),
  ('XqZsoesa55w', 'Ocean Animals', '🐠', 'Animals', '4-7', '7:00', 'en'),
  ('qR3rXWIbqHs', 'Telling Time', '🕐', 'Time', '6-8', '6:45', 'en'),
  ('dT6U1LcV_qU', 'Continents and Oceans', '🗺️', 'Geography', '7-10', '9:00', 'en'),
  ('72YpZ6WMnKs', 'Simple Machines', '⚙️', 'Science', '7-9', '8:30', 'en')
ON CONFLICT (youtube_video_id) DO NOTHING;

-- Sample Products (Educational Toys & Books)
INSERT INTO public.products (name, description, price, image_url, category, age_group, in_stock) VALUES
  ('ABC Learning Board', 'Interactive alphabet learning board with sounds and lights', 299000, NULL, 'Educational Toys', '3-5', true),
  ('Math Blocks Set', 'Colorful counting and math learning blocks (100 pieces)', 199000, NULL, 'Educational Toys', '4-7', true),
  ('Science Kit Junior', 'Basic science experiments for young scientists', 449000, NULL, 'Science Kits', '6-9', true),
  ('World Map Puzzle', 'Educational jigsaw puzzle with country names', 149000, NULL, 'Puzzles', '5-8', true),
  ('Phonics Flash Cards', 'Set of 100 phonics learning flash cards', 99000, NULL, 'Learning Materials', '4-6', true),
  ('Shape Sorter Toy', 'Classic shape sorting toy with 12 shapes', 179000, NULL, 'Educational Toys', '2-4', true),
  ('Animal Encyclopedia', 'Illustrated animal encyclopedia for kids', 259000, NULL, 'Books', '5-9', true),
  ('Number Learning Mat', 'Interactive mat for counting and number recognition', 329000, NULL, 'Educational Toys', '3-6', true),
  ('Build-A-Clock Kit', 'Hands-on clock building and time-learning kit', 189000, NULL, 'Learning Materials', '6-8', true),
  ('Story Time Collection', 'Set of 10 educational storybooks', 399000, NULL, 'Books', '4-8', true),
  ('Coding Robot Toy', 'Beginner-friendly programmable robot', 599000, NULL, 'STEM Toys', '7-10', true),
  ('Art Supplies Set', 'Complete art set with crayons, markers, and paper', 249000, NULL, 'Arts \u0026 Crafts', '4-9', true),
  ('Musical Instruments Set', 'Child-safe musical instruments collection', 359000, NULL, 'Music', '3-7', true),
  ('Geography Globe', 'Interactive talking globe with facts', 489000, NULL, 'Educational Toys', '6-10', true),
  ('Memory Card Game', 'Educational memory matching card game', 129000, NULL, 'Games', '4-8', true)
ON CONFLICT DO NOTHING;

-- Note: User accounts should be created through the registration process
-- Test admin account can be created manually in Supabase dashboard if needed
