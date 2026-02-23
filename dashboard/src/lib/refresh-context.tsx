import { createContext, useContext, useState, type ReactNode } from "react";

interface RefreshContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
  isRefreshing: boolean;
  setRefreshing: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function triggerRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <RefreshContext.Provider
      value={{ refreshKey, triggerRefresh, isRefreshing, setRefreshing: setIsRefreshing }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return ctx;
}
