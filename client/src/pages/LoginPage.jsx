import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Eye, EyeOff, Loader2, AlertCircle, Ambulance, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_ROUTES = {
  AMBULANCE: '/ambulance',
  POLICE: '/police',
  HOSPITAL: '/hospital',
};

const DEMO_ACCOUNTS = [
  { label: 'Ambulance Driver', email: 'driver@lifelane.demo', password: 'Demo@123', icon: Ambulance },
  { label: 'Traffic Police', email: 'police@lifelane.demo', password: 'Demo@123', icon: Shield },
  { label: 'Hospital', email: 'hospital@lifelane.demo', password: 'Demo@123', icon: Building2 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      const user = await login(email, password);
      const destination = ROLE_ROUTES[user.role] || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Unable to connect to LifeLane services.'
          : 'Invalid email or password.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-[#175CD3] hover:underline font-medium mb-4">
            &larr; Back to LifeLane Public Home
          </Link>
          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-[#172033] rounded-[8px]">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-[#182230]">LifeLane</h1>
          <p className="text-xs text-[#667085] mt-0.5">Emergency Mobility Network</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E4E7EC] rounded-[12px] p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-[#182230]">Welcome back</h2>
            <p className="text-sm text-[#667085] mt-1">Sign in to access emergency operations.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-[#FEF3F2] border border-[#FECDCA] rounded-[8px]">
              <AlertCircle className="w-4 h-4 text-[#C62828] mt-0.5 shrink-0" />
              <span className="text-sm text-[#C62828]">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#182230] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#E4E7EC] rounded-[8px] text-[#182230] placeholder-[#667085] focus:outline-none focus:border-[#172033] transition-colors duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#182230] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full px-3 py-2 pr-10 text-sm bg-white border border-[#E4E7EC] rounded-[8px] text-[#182230] placeholder-[#667085] focus:outline-none focus:border-[#172033] transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#182230] transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#172033] hover:bg-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] transition-colors duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Demo Access */}
        <div className="mt-4 bg-white border border-[#E4E7EC] rounded-[12px] p-4 shadow-sm">
          <p className="text-xs font-medium text-[#667085] uppercase tracking-wider mb-3">Demo access</p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 bg-[#F6F7F9] border border-[#E4E7EC] rounded-[8px] hover:border-[#D0D5DD] hover:bg-white text-[#667085] hover:text-[#182230] transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium leading-tight text-center">{account.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#667085] mt-6">Authorized personnel only</p>
      </div>
    </div>
  );
}
