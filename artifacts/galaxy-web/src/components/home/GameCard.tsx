import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../../lib/firebase";

const basePath = import.meta.env.BASE_URL || "/";

interface GameConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  url: string;
  imageUrl?: string;
  category: string;
  enabled: boolean;
  comingSoon?: boolean;
  order: number;
  playerCount?: string;
}

// Static fallback games if Firebase has none
const STATIC_GAMES: GameConfig[] = [
  { id: "carrom", name: "Carrom", icon: "🎯", description: "Skill board game", url: "/games/carrom", category: "skill", enabled: true, order: 1, imageUrl: `${basePath}game_carrom.png` },
  { id: "truth_dare", name: "Truth & Dare", icon: "🎭", description: "Party game", url: "/games/truth-dare", category: "party", enabled: true, order: 2, imageUrl: `${basePath}game_truthdare.png` },
  { id: "yummy_crush", name: "Yummy Crush", icon: "🍭", description: "Match 3 game", url: "/games/yummy-crush", category: "mini", enabled: true, order: 3, imageUrl: `${basePath}game_candy.png` },
  { id: "ludo", name: "Ludo", icon: "🎲", description: "Board game", url: "/games/ludo", category: "party", enabled: true, order: 4, imageUrl: `${basePath}game_ludo.png` },
];

interface Props {
  onCreateRoom?: () => void;
  onNavigate?: (path: string) => void;
}

export default function GameSection({ onCreateRoom, onNavigate }: Props) {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const r = ref(db, "appConfig/games");
    const h = onValue(r, snap => {
      if (!snap.exists()) {
        setGames(STATIC_GAMES);
      } else {
        const all = (Object.values(snap.val()) as GameConfig[])
          .filter(g => g.enabled)
          .sort((a, b) => a.order - b.order);
        setGames(all.length > 0 ? all : STATIC_GAMES);
      }
      setLoaded(true);
    }, () => {
      setGames(STATIC_GAMES);
      setLoaded(true);
    });
    return () => off(r, "value", h);
  }, []);

  function handleGameClick(game: GameConfig) {
    if (game.comingSoon) return;
    if (game.url.startsWith("http")) {
      window.open(game.url, "_blank", "noopener");
    } else if (onNavigate) {
      onNavigate(game.url);
    }
  }

  const displayGames = loaded ? games : STATIC_GAMES;

  return (
    <div className="hp-games-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">Games</h2>
        <button className="hp-create-room-btn" onClick={onCreateRoom}>
          <span>+</span> Create Room
        </button>
      </div>
      <div className="hp-game-banner-list">
        {displayGames.slice(0, 4).map((game) => (
          <div
            key={game.id}
            className="hp-game-banner-card"
            onClick={() => handleGameClick(game)}
            style={{ cursor: game.comingSoon ? "default" : "pointer", position: "relative" }}
          >
            {game.imageUrl ? (
              <img
                src={game.imageUrl}
                alt={game.name}
                className="hp-game-banner-img"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const placeholder = img.parentElement?.querySelector(".hp-game-banner-placeholder");
                  if (placeholder) (placeholder as HTMLElement).classList.add("visible");
                }}
              />
            ) : null}
            <div className="hp-game-banner-placeholder" style={game.imageUrl ? {} : { display: "flex" }}>
              <span style={{ fontSize: 30 }}>{game.icon}</span>
              <span className="hp-game-banner-label">{game.name}</span>
            </div>
            {game.comingSoon && (
              <div style={{
                position: "absolute", top: 6, right: 6,
                background: "rgba(255,193,7,0.9)", color: "#000",
                fontSize: 9, fontWeight: 800, padding: "2px 6px",
                borderRadius: 999, letterSpacing: "0.05em",
              }}>SOON</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
