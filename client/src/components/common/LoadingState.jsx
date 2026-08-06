import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading operations data...' }) {
  return (
    <div className="flex items-center justify-center p-8 text-center text-[#667085]">
      <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#172033]" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
