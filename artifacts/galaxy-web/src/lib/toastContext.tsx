import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"], icon?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((
    message: string,
    type: Toast["type"] = "info",
    _icon?: string
  ) => {
    const id = idRef.current++;
    const duration = 2500;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      
      {/* Toast Container - Chalotalk style position */}
      <div
        style={{
          position: "fixed",
          bottom: "25%", // Screen ke niche wale hisse mein centered dikhane ke liye
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "85%",
          width: "auto",
          pointerEvents: "none",
          alignItems: "center",
        }}
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              role="alert"
              aria-live="polite"
              style={{
                // Exact Chalotalk Layout: White background, no glow, dark text
                background: "#F0F0F2", 
                border: "1px solid #E2E2E4",
                borderRadius: "40px",
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                // Smooth fade in aur out animation
                animation: "toastPopIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), toastFadeOut 0.2s ease-in 2.3s forwards",
                pointerEvents: "auto",
                fontFamily: "'Poppins', 'Inter', sans-serif",
                fontWeight: 600, // Thoda bold text
                fontSize: "14px",
                color: "#1A1A1A", // Dark gray/black text rang
                textAlign: "center",
                maxWidth: "100%",
                wordBreak: "break-word",
              }}
            >
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes toastPopIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes toastFadeOut {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
