import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_CYCLE_CONFIG, type CycleConfig } from './planner-mock';

const CycleConfigContext = createContext<CycleConfig>(DEFAULT_CYCLE_CONFIG);

export function CycleConfigProvider({
  value,
  children,
}: {
  value?: CycleConfig;
  children: ReactNode;
}) {
  return (
    <CycleConfigContext.Provider value={value ?? DEFAULT_CYCLE_CONFIG}>
      {children}
    </CycleConfigContext.Provider>
  );
}

export function useCycleConfig(): CycleConfig {
  return useContext(CycleConfigContext);
}
