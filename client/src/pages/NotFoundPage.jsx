import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#182230] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-8 max-w-md w-full text-center shadow-sm">
        <div className="w-12 h-12 bg-[#F6F7F9] border border-[#E4E7EC] text-[#667085] rounded-[10px] flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <span className="text-xs font-semibold text-[#175CD3] uppercase tracking-wider block mb-1">
          LifeLane Platform
        </span>
        <h1 className="text-xl font-bold text-[#182230] mb-2">Page not found</h1>
        <p className="text-xs text-[#667085] mb-6 leading-relaxed">
          The requested LifeLane resource could not be found.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#172033] hover:bg-[#0F172A] text-white text-xs font-medium rounded-[8px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to operations
        </Link>
      </div>
    </div>
  );
}
