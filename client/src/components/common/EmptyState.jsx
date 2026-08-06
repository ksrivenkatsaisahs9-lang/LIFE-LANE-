import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function EmptyState({ icon: Icon = ShieldAlert, title, description }) {
  return (
    <div className="p-8 border border-dashed border-[#E4E7EC] rounded-[12px] bg-white text-center">
      <div className="w-10 h-10 bg-[#F6F7F9] border border-[#E4E7EC] text-[#667085] rounded-[8px] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-[#667085]" />
      </div>
      <h4 className="text-sm font-semibold text-[#182230] mb-1">{title}</h4>
      {description && <p className="text-xs text-[#667085] max-w-sm mx-auto leading-relaxed">{description}</p>}
    </div>
  );
}
