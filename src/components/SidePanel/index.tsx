import React from 'react';
import { FocusTimeWidget } from './FocusTimeWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { FocusCalendar } from './FocusCalendar';

export const SidePanel: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-3 p-4 h-full overflow-y-auto"
      style={{ background: 'var(--bg)' }}
    >
      <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--t3)' }}>
        Dashboard
      </h3>
      <FocusTimeWidget />
      <UpcomingWidget />
      <FocusCalendar />
      <div className="h-4" /> {/* Bottom padding */}
    </div>
  );
};
