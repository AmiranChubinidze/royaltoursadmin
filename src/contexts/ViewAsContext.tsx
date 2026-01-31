import { createContext, useContext, useState, ReactNode } from "react";

interface ViewAsContextType {
  viewAsRole: string | null;
  setViewAsRole: (role: string | null) => void;
}

const ViewAsContext = createContext<ViewAsContextType | null>(null);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);
  return (
    <ViewAsContext.Provider value={{ viewAsRole, setViewAsRole }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error("useViewAs must be used within ViewAsProvider");
  return ctx;
}
