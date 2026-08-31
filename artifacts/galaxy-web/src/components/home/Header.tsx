// Header.tsx – Clean version: only UI, calls parent to open tasks overlay (no internal overlay)
import { UserProfile } from "../../lib/userService";

interface Props {
  user: UserProfile;
  onOpenSubPage?: (pageId: string) => void;
  onCloseSubPage?: () => void;
  setShowTasks?: (show: boolean) => void;
}

export default function Header({ user, onOpenSubPage, setShowTasks }: Props) {
  const handleTasksClick = () => {
    if (onOpenSubPage) onOpenSubPage("tasks");
    if (setShowTasks) setShowTasks(true);
  };

  return (
    <div className="hp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <div className="hp-header-left">
        <div>
          <h1 className="hp-app-name" style={{ fontSize: "28px", fontWeight: "900", color: "#fff", margin: 0, letterSpacing: "0.05em" }}>
            Galaxy
          </h1>
          <p className="hp-welcome" style={{ fontSize: "12px", color: "rgba(162, 155, 254, 0.8)", margin: "4px 0 0 0" }}>
            Welcome, @<span className="hp-username">{user?.name || "Galaxy User"}</span>
          </p>
        </div>
      </div>
      
      {/* Right Side Icons Row */}
      <div className="hp-header-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        
        {/* 1. Trophy / Ranking Button */}
        <button 
          className="hp-top-icon" 
          style={{
            width: "44px", 
            height: "44px", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(88, 28, 135, 0.6) 0%, rgba(26, 20, 56, 0.8) 100%)",
            border: "1px solid rgba(162, 155, 254, 0.2)", 
            cursor: "pointer", 
            transition: "all 0.2s"
          }}
          title="Ranking"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#fcd34d" style={{ width: "20px", height: "20px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3-3h.375a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-2.25-2.25H19.5m-3 9V18.75m-9 0v-1.125m0 1.125a3 3 0 0 0-3-3h-.375a2.25 2.25 0 0 1-2.25-2.25v-1.5a2.25 2.25 0 0 1 2.25-2.25H4.5m3.75-5.625c0-1.242 1.008-2.25 2.25-2.25h3c1.242 0 2.25 1.008 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-3a2.25 2.25 0 0 1-2.25-2.25V7.5Z" />
          </svg>
        </button>

        {/* 2. Tasks Button -> opens overlay via parent */}
        <button 
          onClick={handleTasksClick}
          className="hp-top-icon" 
          style={{
            width: "44px", 
            height: "44px", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(108, 92, 231, 0.4) 0%, rgba(58, 43, 112, 0.6) 100%)",
            border: "1px solid rgba(162, 155, 254, 0.5)", 
            cursor: "pointer", 
            transition: "all 0.2s",
            boxShadow: "0 0 12px rgba(108, 92, 231, 0.3)"
          }}
          title="Tasks"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#e9d5ff" style={{ width: "20px", height: "20px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l1 1 2-2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 11h1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 16l1 1 2-2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 16h1" />
          </svg>
        </button>

        {/* 3. Friends / Group Button */}
        <button 
          className="hp-top-icon" 
          style={{
            width: "44px", 
            height: "44px", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(88, 28, 135, 0.6) 0%, rgba(26, 20, 56, 0.8) 100%)",
            border: "1px solid rgba(162, 155, 254, 0.2)", 
            cursor: "pointer", 
            transition: "all 0.2s"
          }}
          title="Friends"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#60a5fa" style={{ width: "20px", height: "20px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}