import React from 'react';
import { TranslationStrings } from '../types';
import { MapPin, Navigation, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react';

interface LocationSectionProps {
  t: TranslationStrings;
  mapsUrl?: string;
  restaurantPhone?: string;
  whatsappPhone?: string;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  t,
  mapsUrl = 'https://maps.app.goo.gl/wCkc752cwjRuUXHp7',
  restaurantPhone = '+964 751 549 3953',
  whatsappPhone = '9647515493953'
}) => {
  return (
    <section className="mt-8 mb-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-accent)] p-5 sm:p-6 shadow-sm overflow-hidden animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--border-accent)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#9E121E]/10 dark:bg-[#E6BC73]/15 text-[#9E121E] dark:text-[#E6BC73] flex items-center justify-center">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="font-black text-lg sm:text-xl text-[var(--text-dark)] flex items-center gap-2">
              <span>جهێ مە و ناڤونیشان</span>
              <span className="text-xs font-normal text-[var(--text-light)]">(Our Location)</span>
            </h3>
            <p className="text-xs text-[var(--text-light)] mt-0.5">
              سەردانا تێشتا دادی بکەن بۆ چێژوەرگرتن ژ تامێ خۆشیا خوارنێن کەلتووری و سرۆشتی.
            </p>
          </div>
        </div>

        {/* Primary CTA: Get Directions on Google Maps */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#9E121E] to-[#7C0A11] hover:from-[#7C0A11] hover:to-[#5E050B] text-white text-xs sm:text-sm font-black shadow-md shadow-[#9E121E]/20 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
        >
          <Navigation className="w-4 h-4 text-[#DCAE5B]" />
          <span>Get Directions on Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      {/* Interactive Map Visual Display */}
      <div className="relative w-full h-[220px] sm:h-[280px] rounded-2xl overflow-hidden border border-[var(--border-accent)] mb-5 bg-[#1F2421] shadow-inner group">
        {/* Real Interactive Google Maps iframe centered on Duhok/Kurdistan */}
        <iframe
          title="Têşta Dadê Location on Google Maps"
          src="https://maps.google.com/maps?q=Duhok%20Kurdistan&t=&z=14&ie=UTF8&iwloc=&output=embed"
          className="w-full h-full border-0 grayscale-[25%] contrast-[1.05] group-hover:grayscale-0 transition-all duration-500"
          loading="lazy"
          allowFullScreen
        ></iframe>

        {/* Overlay Marker Card */}
        <div className="absolute bottom-3 start-3 end-3 sm:end-auto bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-accent)] px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-3 max-w-sm pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping flex-shrink-0"></span>
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-[var(--text-dark)] truncate">
                تێشتا دادی - Têşta Dadê
              </p>
              <p className="text-[11px] text-[var(--text-light)] truncate">
                کوردستان • دهۆک
              </p>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[11px] font-bold text-[#9E121E] dark:text-[#E6BC73] underline hover:opacity-80"
          >
            نەخشە
          </a>
        </div>
      </div>

      {/* Info Grid: Address, Hours, Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Address */}
        <div className="p-3.5 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#DCAE5B]/15 text-[#7C0A11] dark:text-[#E6BC73] flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-[var(--text-dark)]">ناڤونیشان (Address)</h4>
            <p className="text-xs text-[var(--text-light)] mt-0.5 leading-relaxed">
              دهۆک، هەرێما کوردستانێ
            </p>
          </div>
        </div>

        {/* Card 2: Working Hours */}
        <div className="p-3.5 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-[var(--text-dark)]">دەمژمێرێن کارکرنێ</h4>
            <p className="text-xs text-[var(--text-light)] mt-0.5 leading-relaxed">
              ڕۆژانە: ٦:٠٠ سپێدێ تا ١:٠٠ نیڤڕۆ
            </p>
          </div>
        </div>

        {/* Card 3: Quick Direct Contact */}
        <div className="p-3.5 rounded-2xl bg-[var(--tab-bg)] border border-[var(--border-accent)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs text-[var(--text-dark)]">پەیوەندی</h4>
              <p className="text-[11px] text-[var(--text-light)]">{restaurantPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${restaurantPhone.replace(/\s+/g, '')}`}
              className="p-2 rounded-xl bg-[#9E121E] text-white hover:bg-[#7C0A11] transition-colors"
              title="تەلەفۆن"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              title="واتسئەپ"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
