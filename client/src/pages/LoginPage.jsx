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
  {
    label: 'Ambulance Driver',
    area: 'Koramangala Zone',
    email: 'driver@lifelane.demo',
    password: 'Demo@123',
    icon: Ambulance,
  },
  {
    label: 'Traffic Police',
    area: 'Richmond Circle Zone',
    email: 'police@lifelane.demo',
    password: 'Demo@123',
    icon: Shield,
  },
  {
    label: 'Hospital',
    area: 'Indiranagar Zone',
    email: 'hospital@lifelane.demo',
    password: 'Demo@123',
    icon: Building2,
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
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
    setSelectedArea(account.area);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
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
            <p className="text-sm text-[#667085] mt-1">Sign in with database credentials to access live emergency operations.</p>
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
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  const matched = DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === e.target.value.toLowerCase());
                  if (matched) setSelectedArea(matched.area);
                }}
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

            {/* Operational Area Display */}
            {selectedArea && (
              <div className="flex items-center justify-between p-2.5 bg-[#F0F4FE] border border-[#B2DDFF] rounded-[8px]">
                <span className="text-xs font-medium text-[#175CD3]">Operational Area:</span>
                <span className="text-xs font-semibold text-[#174187]">{selectedArea}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#172033] hover:bg-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-[8px] transition-colors duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating with DB...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Demo Access Roles & Areas */}
        <div className="mt-4 bg-white border border-[#E4E7EC] rounded-[12px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[#667085] uppercase tracking-wider">Select Role & Operational Area</p>
            <span className="text-[10px] bg-[#ECFDF3] text-[#027A48] border border-[#ABE5C6] px-2 py-0.5 rounded-full font-medium">Real DB Auth</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isSelected = email === account.email;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className={`flex flex-col items-center justify-between p-2.5 border rounded-[8px] transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#F0F4FE] border-[#175CD3] text-[#175CD3] shadow-xs'
                      : 'bg-[#F6F7F9] border-[#E4E7EC] hover:border-[#D0D5DD] hover:bg-white text-[#667085] hover:text-[#182230]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold leading-tight text-center">{account.label}</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#175CD3] bg-white px-1.5 py-0.5 rounded border border-[#D0D5DD] mt-1.5 w-full text-center truncate">
                    {account.area}
                  </span>
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
