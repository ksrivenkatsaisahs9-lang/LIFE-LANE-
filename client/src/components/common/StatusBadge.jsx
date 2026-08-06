import React from 'react';

const STATUS_CONFIGS = {
  READY: { label: 'Ready', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#16794A]', dot: 'bg-[#16794A]' },
  ON_DUTY: { label: 'On duty', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#16794A]', dot: 'bg-[#16794A]' },
  OPERATIONAL: { label: 'Operational', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#16794A]', dot: 'bg-[#16794A]' },
  AVAILABLE: { label: 'Available', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#16794A]', dot: 'bg-[#16794A]' },
  NORMAL: { label: 'Normal', bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#16794A]', dot: 'bg-[#16794A]' },
  EMERGENCY: { label: 'Emergency', bg: 'bg-[#FEF3F2]', border: 'border-[#FECDCA]', text: 'text-[#C62828]', dot: 'bg-[#C62828]' },
  OFFLINE: { label: 'Offline', bg: 'bg-[#F6F7F9]', border: 'border-[#E4E7EC]', text: 'text-[#667085]', dot: 'bg-[#667085]' },
};

export default function StatusBadge({ status = 'READY', customLabel }) {
  const config = STATUS_CONFIGS[status?.toUpperCase()] || STATUS_CONFIGS.READY;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${config.bg} border ${config.border} rounded-[6px]`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-xs font-medium ${config.text}`}>{customLabel || config.label}</span>
    </div>
  );
}
