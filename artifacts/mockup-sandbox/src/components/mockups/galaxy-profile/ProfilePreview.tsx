import {
  Backpack,
  ChevronRight,
  CircleHelp,
  Copy,
  Crown,
  Gem,
  HandCoins,
  Home,
  MessageCircle,
  Mic2,
  QrCode,
  Settings,
  Sparkles,
  Store,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

const quickActions = [
  { label: "Ranking", icon: Trophy, tone: "cream" },
  { label: "My Store", icon: Store, tone: "peach" },
  { label: "Backpack", icon: Backpack, tone: "pink" },
  { label: "Referral", icon: UsersRound, tone: "rose" },
];

const tools = [
  { label: "Host Request", icon: Mic2 },
  { label: "Agency", icon: UsersRound },
  { label: "Host", icon: UserRound },
  { label: "Diamond Trading", icon: HandCoins },
  { label: "Level", icon: Crown },
  { label: "My QR Code", icon: QrCode },
  { label: "Help", icon: CircleHelp },
  { label: "Settings", icon: Settings },
];

function DoubleChevron() {
  return (
    <span className="gxp-double-chevron" aria-hidden="true">
      <ChevronRight size={22} strokeWidth={2.4} />
      <ChevronRight size={22} strokeWidth={2.4} />
    </span>
  );
}

export function ProfilePreview() {
  return (
    <div className="gxp-page">
      <style>{`
        :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; background: #edf5ff; }
        button { font: inherit; }
        .gxp-page {
          width: 100%;
          max-width: 390px;
          height: 100vh;
          min-height: 844px;
          overflow-y: auto;
          position: relative;
          padding: 20px 14px 86px;
          color: #2e2853;
          background:
            radial-gradient(circle at 95% 7%, rgba(177, 167, 255, .42), transparent 28%),
            radial-gradient(circle at 0% 25%, rgba(160, 219, 255, .36), transparent 30%),
            linear-gradient(180deg, #eaf4ff 0%, #f0efff 48%, #f9f7ff 100%);
          scrollbar-width: none;
        }
        .gxp-page::-webkit-scrollbar { display: none; }
        .gxp-page::before {
          content: "";
          position: absolute;
          z-index: 0;
          top: -35px;
          right: 9%;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(255, 255, 255, .3);
          filter: blur(4px);
          pointer-events: none;
        }
        .gxp-content { position: relative; z-index: 1; }
        .gxp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px 15px;
        }
        .gxp-kicker {
          margin: 0 0 3px;
          color: #8c82b8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.7px;
        }
        .gxp-title {
          margin: 0;
          color: #29234c;
          font-size: 27px;
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -.7px;
        }
        .gxp-header-button {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 14px;
          background: rgba(255,255,255,.64);
          color: #6d5bc1;
          box-shadow: 0 7px 18px rgba(99,87,177,.1);
        }
        .gxp-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 94px;
          padding: 8px 8px 11px 5px;
          margin-bottom: 13px;
        }
        .gxp-avatar-wrap {
          position: relative;
          flex: 0 0 auto;
          width: 86px;
          height: 86px;
          display: grid;
          place-items: center;
        }
        .gxp-avatar-ring {
          width: 82px;
          height: 82px;
          display: grid;
          place-items: center;
          border: 4px solid rgba(255,255,255,.94);
          border-radius: 50%;
          background: linear-gradient(145deg, #a99cff, #d6ceff);
          box-shadow: 0 8px 22px rgba(111,94,191,.2), 0 0 0 4px rgba(199,191,255,.38);
        }
        .gxp-avatar {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border: 3px solid #fff;
          border-radius: 50%;
          color: #fff;
          background: linear-gradient(135deg, #7d69d5, #a5d9f3);
          font-size: 24px;
          font-weight: 850;
          letter-spacing: -1px;
        }
        .gxp-online {
          position: absolute;
          right: 2px;
          bottom: 7px;
          width: 13px;
          height: 13px;
          border: 3px solid #f0efff;
          border-radius: 50%;
          background: #56d59a;
        }
        .gxp-identity-copy { min-width: 0; flex: 1; }
        .gxp-name {
          margin: 0;
          overflow: hidden;
          color: #2d2754;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gxp-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 7px;
        }
        .gxp-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          min-height: 21px;
          padding: 2px 7px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 750;
          line-height: 1;
        }
        .gxp-gender { color: #6452b5; background: #e8e2ff; border-color: #d8ceff; }
        .gxp-age { color: #ce6d96; background: #ffe6ef; border-color: #ffd3e3; }
        .gxp-level { color: #6a58bd; background: #e8f2ff; border-color: #d4e4ff; }
        .gxp-vip { color: #a76c18; background: #fff1c8; border-color: #ffe4a2; }
        .gxp-id {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          border: 0;
          padding: 0;
          color: #9389bb;
          background: transparent;
          font-size: 10px;
          font-weight: 650;
        }
        .gxp-id svg { color: #7d6cca; }
        .gxp-identity-chevron { flex: 0 0 auto; color: #a59cc8; }
        .gxp-card {
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 20px;
          background: rgba(255,255,255,.82);
          box-shadow: 0 10px 26px rgba(110,100,179,.08);
          backdrop-filter: blur(16px);
        }
        .gxp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 13px;
          padding: 14px 3px;
        }
        .gxp-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 51px;
          border: 0;
          border-right: 1px solid #ece7fb;
          background: transparent;
          color: #332b5b;
        }
        .gxp-stat:last-child { border-right: 0; }
        .gxp-stat strong { font-size: 19px; line-height: 1; font-weight: 850; }
        .gxp-stat span { margin-top: 6px; color: #9387bd; font-size: 10px; font-weight: 650; }
        .gxp-coins {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 82px;
          margin-bottom: 13px;
          padding: 13px 16px;
          border: 1px solid rgba(255,255,255,.85);
          border-radius: 20px;
          color: #7a4711;
          background: linear-gradient(105deg, #ffb53e 0%, #ffc65a 46%, #ffdc84 100%);
          box-shadow: 0 11px 24px rgba(224,147,43,.18), inset 0 1px 0 rgba(255,255,255,.55);
        }
        .gxp-coin {
          position: relative;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          margin-right: 12px;
          border: 4px solid rgba(255,255,255,.8);
          border-radius: 50%;
          color: #fff8d9;
          background: linear-gradient(145deg, #f3a322, #ffcf52);
          box-shadow: 0 4px 10px rgba(146,84,9,.18), inset 0 2px 3px rgba(255,255,255,.45);
        }
        .gxp-star { position: absolute; top: 9px; right: 10px; }
        .gxp-coins-copy { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .gxp-coins-copy span { color: rgba(111,64,10,.72); font-size: 11px; font-weight: 700; }
        .gxp-coins-copy strong { margin-top: 3px; color: #7a4309; font-size: 24px; line-height: 1; font-weight: 900; letter-spacing: -.5px; }
        .gxp-double-chevron { display: inline-flex; align-items: center; gap: 0; color: rgba(119,68,13,.72); }
        .gxp-double-chevron svg + svg { margin-left: -10px; }
        .gxp-section { padding: 15px 13px 14px; margin-bottom: 13px; }
        .gxp-section-title { margin: 0 3px 13px; color: #3b3268; font-size: 13px; font-weight: 820; }
        .gxp-quick-grid, .gxp-tools-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .gxp-quick-grid { gap: 6px; }
        .gxp-quick-item, .gxp-tool-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
          border: 0;
          background: transparent;
          color: #7669a8;
        }
        .gxp-quick-item { gap: 7px; }
        .gxp-quick-item > span:last-child, .gxp-tool-item > span:last-child {
          max-width: 100%;
          overflow: hidden;
          font-size: 9px;
          font-weight: 720;
          line-height: 1.15;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gxp-quick-icon, .gxp-tool-icon {
          display: grid;
          place-items: center;
          width: 45px;
          height: 43px;
          border: 1px solid rgba(255,255,255,.8);
          border-radius: 14px;
        }
        .gxp-quick-icon.cream { color: #c58b32; background: #fff3d5; }
        .gxp-quick-icon.peach { color: #e18c62; background: #ffe4d5; }
        .gxp-quick-icon.pink { color: #d875a2; background: #ffe1ea; }
        .gxp-quick-icon.rose { color: #b76a8c; background: #f8dfe6; }
        .gxp-tools-grid { row-gap: 17px; }
        .gxp-tool-item { gap: 7px; padding: 0 3px; }
        .gxp-tool-icon { border-color: #eeebf8; border-radius: 13px; color: #534a7e; background: #faf9ff; }
        .gxp-tool-item:nth-child(2) .gxp-tool-icon, .gxp-tool-item:nth-child(6) .gxp-tool-icon { color: #8c6cd1; }
        .gxp-tool-item:nth-child(4) .gxp-tool-icon { color: #b776a6; }
        .gxp-bottom-nav {
          position: fixed;
          z-index: 10;
          right: 0;
          bottom: 0;
          left: 0;
          max-width: 390px;
          height: 70px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          padding: 9px 4px 0;
          border-top: 1px solid rgba(215,208,239,.72);
          background: rgba(255,255,255,.96);
          box-shadow: 0 -8px 24px rgba(92,79,159,.07);
          backdrop-filter: blur(16px);
        }
        .gxp-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          border: 0;
          color: #aaa2c3;
          background: transparent;
          font-size: 9px;
          font-weight: 700;
        }
        .gxp-nav-item.active { color: #7056ca; }
        .gxp-nav-item.active svg { filter: drop-shadow(0 4px 8px rgba(112,86,202,.25)); }
      `}</style>

      <div className="gxp-content">
        <header className="gxp-header">
          <div>
            <p className="gxp-kicker">GALAXY RIDER</p>
            <h1 className="gxp-title">My Profile</h1>
          </div>
          <button className="gxp-header-button" aria-label="Settings">
            <Settings size={19} strokeWidth={2.2} />
          </button>
        </header>

        <section className="gxp-identity">
          <div className="gxp-avatar-wrap">
            <div className="gxp-avatar-ring"><div className="gxp-avatar">GR</div></div>
            <span className="gxp-online" />
          </div>
          <div className="gxp-identity-copy">
            <h2 className="gxp-name">Galaxy Rider</h2>
            <div className="gxp-meta">
              <span className="gxp-pill gxp-gender">♂ Male</span>
              <span className="gxp-pill gxp-age">18</span>
              <span className="gxp-pill gxp-level"><Sparkles size={12} /> Lv.4</span>
              <span className="gxp-pill gxp-vip"><Crown size={11} /> VIP</span>
            </div>
            <button className="gxp-id">ID: 88870003 <Copy size={13} /></button>
          </div>
          <ChevronRight className="gxp-identity-chevron" size={20} strokeWidth={2} />
        </section>

        <section className="gxp-card gxp-stats">
          {[["0", "Friend"], ["0", "Follow"], ["0", "Followers"], ["0", "Visitors"]].map(([value, label]) => (
            <div className="gxp-stat" key={label}><strong>{value}</strong><span>{label}</span></div>
          ))}
        </section>

        <section className="gxp-coins">
          <span className="gxp-coin">
            <Gem size={26} strokeWidth={2.1} />
            <Sparkles className="gxp-star" size={12} fill="currentColor" />
          </span>
          <span className="gxp-coins-copy">
            <span>Available My Diamonds</span>
            <strong>5000.00</strong>
          </span>
          <DoubleChevron />
        </section>

        <section className="gxp-card gxp-section">
          <h3 className="gxp-section-title">Quick Actions</h3>
          <div className="gxp-quick-grid">
            {quickActions.map(({ label, icon: Icon, tone }) => (
              <div className="gxp-quick-item" key={label}>
                <span className={`gxp-quick-icon ${tone}`}><Icon size={20} strokeWidth={1.9} /></span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="gxp-card gxp-section">
          <h3 className="gxp-section-title">Tools</h3>
          <div className="gxp-tools-grid">
            {tools.map(({ label, icon: Icon }) => (
              <div className="gxp-tool-item" key={label}>
                <span className="gxp-tool-icon"><Icon size={20} strokeWidth={1.8} /></span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <nav className="gxp-bottom-nav" aria-label="Main navigation">
        <span className="gxp-nav-item"><Home size={20} strokeWidth={2.1} /><span>Home</span></span>
        <span className="gxp-nav-item"><Sparkles size={20} strokeWidth={2.1} /><span>Explore</span></span>
        <span className="gxp-nav-item"><Mic2 size={20} strokeWidth={2.1} /><span>Rooms</span></span>
        <span className="gxp-nav-item"><MessageCircle size={20} strokeWidth={2.1} /><span>Chats</span></span>
        <span className="gxp-nav-item active"><UserRound size={20} strokeWidth={2.1} /><span>Mine</span></span>
      </nav>
    </div>
  );
}