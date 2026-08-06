import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from './StatusBadge';

export default function PageHeader({ title, code, status = 'READY' }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-[#E4E7EC] px-4 md:px-6 py-3.5 flex items-center justify-between">
      {/* Left Branding */}
      <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-8 h-8 bg-[#172033] rounded-[8px] flex items-center justify-center text-white shrink-0">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#182230] leading-none">LifeLane</h1>
            {code && (
              <span className="px-2 py-0.5 bg-[#F6F7F9] border border-[#E4E7EC] text-xs font-medium text-[#182230] rounded-[6px]">
                {code}
              </span>
            )}
          </div>
          <span className="text-xs text-[#667085] leading-tight block mt-0.5">
            {title || 'Emergency Mobility Network'}
          </span>
        </div>
      </Link>

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />

        <div className="hidden sm:block text-right pl-3 border-l border-[#E4E7EC]">
          <div className="text-xs font-medium text-[#182230]">{user?.name}</div>
          <div className="text-[11px] text-[#667085]">{user?.role}</div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#667085] hover:text-[#182230] bg-white border border-[#E4E7EC] hover:border-[#D0D5DD] rounded-[8px] transition-colors duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
