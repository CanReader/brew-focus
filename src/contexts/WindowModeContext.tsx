import React, { createContext, useContext, ReactNode } from 'react';
import { useWindowMode, WindowMode } from '../hooks/useWindowMode';

interface WindowModeContextType {
  mode: WindowMode;
  isFullscreen: boolean;
  isWidget: boolean;
  isNormal: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  enterWidget: () => Promise<void>;
  exitWidget: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  toggleWidget: () => Promise<void>;
  exitToNormal: () => Promise<void>;
}

const WindowModeContext = createContext<WindowModeContextType | null>(null);

export const WindowModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const windowMode = useWindowMode();

  return (
    <WindowModeContext.Provider value={windowMode}>
      {children}
    </WindowModeContext.Provider>
  );
};

export const useWindowModeContext = () => {
  const context = useContext(WindowModeContext);
  if (!context) {
    throw new Error('useWindowModeContext must be used within a WindowModeProvider');
  }
  return context;
};
