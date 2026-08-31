import { useState, useEffect, useRef } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../../lib/firebase";

const basePath = import.meta.env.BASE_URL || "/";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image?: string;
  gradient: string;
  order: number;
  enabled: boolean;
}

const FALLBACK_BANNERS: Banner[] = [
  { id: "portal",  title: "Welcome to Galaxy",   subtitle: "Discover magical voice rooms",    badge: "NEW",     gradient: "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(191,0,255,0.2))",  order: 0, enabled: true, image: `${basePath}banner1.png` },
  { id: "gaming",  title: "New Features",         subtitle: "Play with friends worldwide",      badge: "HOT",     gradient: "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,230,118,0.15))", order: 1, enabled: true, image: `${basePath}banner2.png` },
  { id: "rewards", title: "Daily Rewards",        subtitle: "Claim coins & gifts every day",   badge: "REWARDS", gradient: "linear-gradient(135deg, rgba(255,100,50,0.3), rgba(255,215,0,0.2))",  order: 2, enabled: true, image: `${basePath}banner3.png` },
];

export default function BannerCarousel() {
  const [banners, setBanners]   = useState<Banner[]>([]);
  const [current, setCurrent]   = useState(0);
  const [paused,  setPaused]    = useState(false);
  const [loaded,  setLoaded]    = useState(false);
  const touchX = useRef(0);

  useEffect(() => {
    const r = ref(db, "appConfig/banners");
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, Banner>;
        const active = Object.values(val)
          .filter(b => b.enabled !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setBanners(active.length ? active : FALLBACK_BANNERS);
      } else {
        setBanners(FALLBACK_BANNERS);
      }
      setLoaded(true);
      setCurrent(0);
    });
    return () => off(r, "value", unsub);
  }, []);

  useEffect(() => {
    if (paused || banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused, banners.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) setCurrent(prev => (prev + 1) % banners.length);
      else setCurrent(prev => (prev - 1 + banners.length) % banners.length);
    }
    setTimeout(() => setPaused(false), 1000);
  };

  if (!loaded || banners.length === 0) {
    return <div className="hp-banner-wrap" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, animation: "shimmer 1.4s ease infinite" }} />;
  }

  return (
    <div className="hp-banner-wrap">
      <div
        className="hp-banner-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((b) => (
          <div key={b.id} className="hp-banner-slide">
            <div className="hp-banner-card" style={{ background: b.gradient }}>
              {b.image && (
                <img src={b.image} alt={b.title} className="hp-banner-img" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }} />
              )}
              <div className="hp-banner-overlay" />
              <div className="hp-banner-content">
                <span className="hp-banner-badge">{b.badge}</span>
                <h3 className="hp-banner-title">{b.title}</h3>
                <p className="hp-banner-subtitle">{b.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hp-banner-dots">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`hp-banner-dot${current === i ? " active" : ""}`}
            onClick={() => { setCurrent(i); setPaused(false); }}
          />
        ))}
      </div>
    </div>
  );
}
