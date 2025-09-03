
import React, { useState, useEffect } from 'react';
import { Pizza, ChefHat, Clock, Star, Flower } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { supabase } from '@/integrations/supabase/client';
import VideoBackground from './VideoBackground';

const About = () => {
  const { language, t } = useLanguage();
  const [aboutContent, setAboutContent] = useState(null);
  const [chiSiamoContent, setChiSiamoContent] = useState(null);
  const [chiSiamoImage, setChiSiamoImage] = useState({
    image: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    alt: 'PIZZALAB - La nostra storia'
  });
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());

  useEffect(() => {
    console.log('🚀 [About] Component mounted, loading content...');

    const loadAboutContent = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'aboutContent')
          .single();

        if (!error && data?.value) {
          setAboutContent(data.value);
        }
      } catch (error) {
        console.log('About content not found in database, using default');
      }
    };

    const loadChiSiamoContent = async () => {
      try {
        console.log('🔄 [About] Loading Chi Siamo content from database...');
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'chiSiamoContent')
          .single();

        if (!error && data?.value) {
          console.log('✅ [About] Chi Siamo content loaded:', data.value);
          const value = data.value as any;
          console.log('🖼️ [About] Background image from DB:', value.backgroundImage);
          setChiSiamoContent(data.value);
        } else {
          console.log('⚠️ [About] No Chi Siamo content found, using default');
          console.log('❌ [About] Database error:', error);
        }
      } catch (error) {
        console.error('❌ [About] Error loading Chi Siamo content:', error);
      }
    };

    const loadChiSiamoImage = async () => {
      try {
        console.log('🔄 [About] Loading Chi Siamo image from database...');
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'chiSiamoImage')
          .single();

        if (!error && data?.value) {
          console.log('✅ [About] Chi Siamo image loaded:', data.value);
          setChiSiamoImage(data.value);
        } else {
          console.log('⚠️ [About] No Chi Siamo image found, using default');
        }
      } catch (error) {
        console.error('❌ [About] Error loading Chi Siamo image:', error);
      }
    };

    loadAboutContent();
    loadChiSiamoContent();
    loadChiSiamoImage();

    // Set up real-time listener for Chi Siamo content and image changes
    const timestamp = Date.now();
    const channelName = `chi-siamo-updates-${timestamp}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'settings',
        filter: 'key=eq.chiSiamoImage'
      }, async (payload) => {
        console.log('🔔 [About] Real-time Chi Siamo image update received from admin');
        console.log('📦 [About] Payload:', payload);
        if (payload.new?.value) {
          console.log('🖼️ [About] New image data:', payload.new.value);
          setChiSiamoImage(payload.new.value);
          console.log('✅ [About] Chi Siamo image updated from real-time change');

          // Force a re-render by updating the refresh key
          console.log('🔄 [About] Forcing component refresh...');
          setImageRefreshKey(Date.now());
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'settings',
        filter: 'key=eq.chiSiamoContent'
      }, async (payload) => {
        console.log('🔔 [About] Real-time Chi Siamo content update received from admin');
        if (payload.new?.value) {
          setChiSiamoContent(payload.new.value);
          console.log('✅ [About] Chi Siamo content updated from real-time change');
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Multilingual content
  const content = {
    it: {
      title: '👨‍🍳 Chi Siamo - PIZZALAB',
      storyTitle: '🍕 La Nostra Storia',
      paragraph1: 'PIZZALAB nasce dalla passione per l\'innovazione nella tradizione italiana, unendo l\'esperienza culinaria classica con tecniche moderne. Da anni, offriamo pizza preparata con amore, ingredienti freschi selezionati e un approccio innovativo alla tradizione.',
      paragraph2: 'Le nostre pizze nascono da una profonda passione per la tradizione culinaria italiana reinventata. Solo ingredienti selezionati, solo autenticità made in Torino con un tocco di innovazione. 🍕 Situati nel cuore di Torino, offriamo esperienza artigianale e passione per la vera pizza italiana innovativa.',
      quote: '🏪 Nel nostro laboratorio puoi trovare:',
      quoteAuthor: 'Un viaggio tra sapori, tradizione e innovazione',
      servicesTitle: 'Nel nostro laboratorio puoi trovare:',
      services: [
        'Pizza italiana innovativa cotta nel forno a legna',
        'Ingredienti freschi selezionati e di prima qualità',
        'Impasto preparato quotidianamente con lievitazione naturale e tecniche moderne',
        'Servizio per eventi e feste personalizzato'
      ],
      stats: {
        years: 'Anni di Esperienza',
        customers: 'Clienti Soddisfatti',
        varieties: 'Varietà di Pizze'
      },
      closingMessage: 'Vieni a trovarci da PIZZALAB e scopri il futuro della tradizione italiana.',
      tagline: 'Creiamo sapori innovativi, una pizza alla volta'
    },
    en: {
      title: '👨‍🍳 About Us - PIZZALAB',
      storyTitle: '🍕 Our Story',
      paragraph1: 'PIZZALAB was born from a passion for innovation in Italian tradition, combining classic culinary experience with modern techniques. For years, we offer pizza prepared with love, selected fresh ingredients and an innovative approach to tradition.',
      paragraph2: 'Our pizzas are born from a deep passion for reinvented Italian culinary tradition. Only selected ingredients, only authenticity made in Turin with a touch of innovation. 🍕 Located in the heart of Turin, we offer artisanal experience and passion for innovative Italian pizza.',
      quote: '🏪 In our laboratory you can find:',
      quoteAuthor: 'A journey through flavors, tradition and innovation',
      servicesTitle: 'In our laboratory you can find:',
      services: [
        'Innovative Italian pizza cooked in a wood-fired oven',
        'Selected fresh and top quality ingredients',
        'Dough prepared daily with natural leavening and modern techniques',
        'Service for events and personalized parties'
      ],
      stats: {
        years: 'Years of Experience',
        customers: 'Satisfied Customers',
        varieties: 'Pizza Varieties'
      },
      closingMessage: 'Come visit us at PIZZALAB and discover the future of Italian tradition.',
      tagline: 'Creating innovative flavors, one pizza at a time'
    },
    fr: {
      title: '👨‍🍳 À Propos - PIZZALAB',
      storyTitle: '🍕 Notre Histoire',
      paragraph1: 'PIZZALAB est né d\'une passion pour l\'innovation dans la tradition italienne, combinant l\'expérience culinaire classique avec des techniques modernes. Depuis des années, nous offrons de la pizza préparée avec amour, des ingrédients frais sélectionnés et une approche innovante de la tradition.',
      paragraph2: 'Nos pizzas naissent d\'une passion profonde pour la tradition culinaire italienne réinventée. Seulement des ingrédients sélectionnés, seulement l\'authenticité made in Turin avec une touche d\'innovation. 🍕 Situés au cœur de Turin, nous offrons une expérience artisanale et une passion pour la pizza italienne innovante.',
      quote: '🏪 Dans notre laboratoire vous pouvez trouver:',
      quoteAuthor: 'Un voyage à travers les saveurs, la tradition et l\'innovation',
      servicesTitle: 'Dans notre laboratoire vous pouvez trouver:',
      services: [
        'Pizza italienne innovante cuite au four à bois',
        'Ingrédients frais sélectionnés et de première qualité',
        'Pâte préparée quotidiennement avec levage naturel et techniques modernes',
        'Service pour événements et fêtes personnalisé'
      ],
      stats: {
        years: 'Années d\'Expérience',
        customers: 'Clients Satisfaits',
        varieties: 'Variétés de Pizzas'
      },
      closingMessage: 'Venez nous rendre visite chez PIZZALAB et découvrez l\'avenir de la tradition italienne.',
      tagline: 'Créer des saveurs innovantes, une pizza à la fois'
    },
    ar: {
      title: 'حول بيتزالاب',
      storyTitle: 'قصتنا',
      paragraph1: 'ولد بيتزالاب من شغف بالابتكار في التقاليد الإيطالية، يجمع بين الخبرة الطهوية الكلاسيكية والتقنيات الحديثة. منذ سنوات، نقدم البيتزا المحضرة بحب، مع مكونات طازجة مختارة ونهج مبتكر للتقاليد.',
      paragraph2: 'بيتزاتنا تولد من شغف عميق بالتقاليد الطهوية الإيطالية المعاد اختراعها. فقط مكونات مختارة، فقط أصالة صنع في تورين مع لمسة من الابتكار. 🍕 تقع في قلب تورين، نقدم خبرة حرفية وشغف بالبيتزا الإيطالية المبتكرة.',
      quote: '📍 اعثر علينا في وسط تورين – حيث تلتقي التقاليد الإيطالية بالابتكار.',
      quoteAuthor: 'رحلة عبر النكهات والتقاليد والابتكار',
      servicesTitle: 'في مختبرنا يمكنك أن تجد:',
      services: [
        'بيتزا إيطالية مبتكرة مطبوخة في فرن الحطب',
        'مكونات طازجة مختارة وعالية الجودة',
        'عجين محضر يومياً مع تخمير طبيعي وتقنيات حديثة',
        'خدمة للفعاليات والحفلات والتموين المخصص'
      ],
      stats: {
        years: 'سنوات الخبرة',
        customers: 'عملاء راضون',
        varieties: 'أنواع البيتزا'
      },
      closingMessage: 'تعال لزيارتنا في بيتزالاب واكتشف مستقبل التقاليد الإيطالية.',
      tagline: 'نخلق نكهات مبتكرة، بيتزا واحدة في كل مرة'
    },
    fa: {
      title: 'درباره پیتزالاب',
      storyTitle: 'داستان ما',
      paragraph1: 'پیتزالاب از عشق به نوآوری در سنت‌های ایتالیایی، ترکیب تجربه آشپزی کلاسیک با تکنیک‌های مدرن متولد شد. سال‌هاست که ما پیتزای تهیه شده با عشق، مواد تازه انتخابی و رویکرد نوآورانه به سنت ارائه می‌دهیم.',
      paragraph2: 'پیتزاهای ما از عشق عمیق به سنت‌های آشپزی ایتالیایی بازآفرینی شده متولد می‌شوند. فقط مواد انتخابی، فقط اصالت ساخت تورین با لمسه‌ای از نوآوری. 🍕 واقع در قلب تورین، ما تجربه صنعتگری و عشق به پیتزای نوآورانه ایتالیایی ارائه می‌دهیم.',
      quote: '📍 ما را در مرکز تورین پیدا کنید – جایی که سنت ایتالیایی با نوآوری ملاقات می‌کند.',
      quoteAuthor: 'سفری در میان طعم‌ها، سنت و نوآوری',
      servicesTitle: 'در آزمایشگاه ما می‌توانید پیدا کنید:',
      services: [
        'پیتزای نوآورانه ایتالیایی پخته شده در کوره هیزمی',
        'مواد تازه انتخابی و با کیفیت بالا',
        'خمیر تهیه شده روزانه با تخمیر طبیعی و تکنیک‌های مدرن',
        'خدمات برای رویدادها، جشن‌ها و کترینگ شخصی‌سازی شده'
      ],
      stats: {
        years: 'سال تجربه',
        customers: 'مشتریان راضی',
        varieties: 'انواع پیتزا'
      },
      closingMessage: 'برای دیدن ما به پیتزالاب بیایید و آینده سنت ایتالیایی را کشف کنید.',
      tagline: 'خلق طعم‌های نوآورانه، یک پیتزا در هر زمان'
    }
  };

  // Use database content if available, otherwise fallback to hardcoded content
  const currentContent = chiSiamoContent
    ? (chiSiamoContent[language] || chiSiamoContent.it)
    : (content[language] || content.it);

  // Create background style with cache busting
  const backgroundImageUrl = chiSiamoContent?.backgroundImage ?
    `${chiSiamoContent.backgroundImage}${chiSiamoContent.backgroundImage.includes('?') ? '&' : '?'}t=${imageRefreshKey}` :
    undefined;

  const sectionStyle = {
    backgroundImage: backgroundImageUrl ?
      `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('${backgroundImageUrl}')` :
      undefined,
    backgroundSize: backgroundImageUrl ? 'cover' : undefined,
    backgroundPosition: backgroundImageUrl ? 'center' : undefined,
  };

  // Debug logging
  console.log('🔍 [About] Debug Info:');
  console.log('   - chiSiamoContent:', chiSiamoContent);
  console.log('   - chiSiamoContent?.backgroundImage:', chiSiamoContent?.backgroundImage);
  console.log('   - backgroundImageUrl:', backgroundImageUrl);
  console.log('   - Will use background image?', !!backgroundImageUrl);
  console.log('   - Section style:', sectionStyle);

  // Add manual refresh function to window for debugging
  React.useEffect(() => {
    (window as any).refreshAboutBackground = () => {
      console.log('🔄 [About] Manual background refresh triggered');
      setImageRefreshKey(Date.now());
    };
  }, []);

  return (
    <section
      id="about"
      className="py-20 section-light-warm relative overflow-hidden"
      style={sectionStyle}
    >
      {/* Basketball-themed background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-timeout-orange rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-timeout-orange-hover rounded-full blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-timeout-orange-light rounded-full blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating basketball/pizza icons */}
      <div className="absolute top-20 right-20 timeout-text-accent/20 animate-float">
        <div className="text-4xl">🏀</div>
      </div>
      <div className="absolute bottom-20 left-20 timeout-text-accent/20 animate-float animation-delay-2000">
        <Pizza size={40} />
      </div>
      <div className="absolute top-1/3 left-10 timeout-text-accent/20 animate-float animation-delay-4000">
        <ChefHat size={30} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Title */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold timeout-text-primary timeout-heading mb-4">
            Chi Siamo
          </h2>
          <p className="text-lg timeout-text-accent">
            La nostra storia, la nostra passione per l'innovazione nella pizza italiana
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          {/* Left Content */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold timeout-text-primary mb-4">
                {currentContent?.title || "Il laboratorio di pizza che non ti aspettavi!"}
              </h3>
              <div className="space-y-4 timeout-text-secondary text-lg leading-relaxed">
                <p>
                  {currentContent?.paragraph1 || "PIZZALAB nasce dalla passione per l'innovazione nella tradizione italiana, unendo l'esperienza culinaria classica con tecniche moderne e creative."}
                </p>
                <p>
                  {currentContent?.paragraph2 || "La nostra missione è offrire pizze di altissima qualità con ingredienti freschi e genuini, in un ambiente unico che celebra l'innovazione e la creatività culinaria italiana."}
                </p>
                {currentContent?.quote && (
                  <p>
                    {currentContent.quote}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 timeout-bg-accent rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🏀</span>
                </div>
                <div>
                  <div className="timeout-text-primary font-bold">
                    {currentContent?.stats?.years || "Dal 2025"}
                  </div>
                  <div className="timeout-text-secondary text-sm">
                    {currentContent?.stats?.customers || "6 giorni su 7"}
                  </div>
                </div>
              </div>
            </div>

            {/* Services Section */}
            {currentContent?.services && currentContent.services.length > 0 && (
              <div className="pt-6">
                <h4 className="text-lg font-semibold timeout-text-primary mb-4">
                  {currentContent?.servicesTitle || "I nostri servizi:"}
                </h4>
                <ul className="space-y-2">
                  {currentContent.services.map((service, index) => (
                    <li key={index} className="flex items-center gap-2 timeout-text-secondary">
                      <span className="text-timeout-orange">•</span>
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Closing Message */}
            {currentContent?.closingMessage && (
              <div className="pt-6 border-t border-timeout-orange/20">
                <p className="timeout-text-secondary italic">
                  {currentContent.closingMessage}
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Image Carousel */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-timeout-secondary">
              {/* Main Image Container */}
              <div className="aspect-[4/3] relative">
                {chiSiamoImage.image ? (
                  <img
                    src={`${chiSiamoImage.image}${chiSiamoImage.image.includes('?') ? '&' : '?'}t=${imageRefreshKey}`}
                    alt={chiSiamoImage.alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('❌ [About] Chi Siamo image failed to load:', chiSiamoImage.image);
                      // Fallback to basketball court image
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                    }}
                    onLoad={() => {
                      console.log('✅ [About] Chi Siamo image loaded successfully:', chiSiamoImage.image);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-timeout-dark-gray to-timeout-medium-gray flex items-center justify-center">
                    <div className="text-center timeout-text-secondary">
                      <div className="text-6xl mb-4">🏀</div>
                      <p className="text-lg">Il Nostro Ristorante</p>
                      <p className="text-sm mt-2">Dove la pizza incontra il basket</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Navigation Dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="w-2 h-2 bg-timeout-orange rounded-full"></div>
                <div className="w-2 h-2 bg-timeout-light-gray rounded-full"></div>
                <div className="w-2 h-2 bg-timeout-light-gray rounded-full"></div>
              </div>

              {/* Navigation Arrows */}
              <button className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                <span className="text-lg">‹</span>
              </button>
              <button className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                <span className="text-lg">›</span>
              </button>
            </div>

            {/* Bottom Info Panel */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
              <h4 className="text-white font-bold text-lg mb-2">Il Nostro Ristorante</h4>
              <p className="text-white/90 text-sm">
                Dove accogliamo i nostri clienti con la passione per la pizza e il basket
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
