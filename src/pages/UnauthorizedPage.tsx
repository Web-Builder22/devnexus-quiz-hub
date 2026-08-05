import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { BrandingFooter } from '../components/BrandingFooter';

export function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="mx-auto h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          You do not have the required permissions to access this page.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
      <BrandingFooter className="absolute bottom-6 left-0 w-full" />
    </div>
  );
}
