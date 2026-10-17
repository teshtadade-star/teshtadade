import React, { useState } from 'react';
import { TranslationStrings } from '../types';
import { Lock, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { verifyPassword } from '../services/auth';

interface AdminLoginViewProps {
  onSuccess: () => void;
  onGoToCustomerMenu: () => void;
  t: TranslationStrings;
  storedHash?: string;
  storedSalt?: string;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccess,
  onGoToCustomerMenu,
  t,
  storedHash,
  storedSalt
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(true);
      return;
    }

    try {
      setIsVerifying(true);
      setError(false);

      // Cryptographic salted hash verification
      const isValid = await verifyPassword(password.trim(), storedHash, storedSalt);

      if (isValid) {
        setError(false);
        setPassword('');
        onSuccess();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      <div className="w-full max-w-md bg-[var(--card-bg)] border-2 border-[var(--border-accent)] rounded-3xl p-6 sm:p-8 shadow-2xl animate-scaleUp text-[var(--text-dark)]">
        {/* Top Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#9E121E] to-[#C1121C] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#9E121E]/30 border-2 border-[#DCAE5B]">
            <ShieldCheck className="w-9 h-9 text-[#DCAE5B]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#9E121E] dark:text-[#E6BC73] mb-1">
            Dedicated Admin Portal
          </span>
          <h2 className="text-2xl font-black text-[var(--text-dark)]">
            {t.adminLoginTitle || 'پانێلی ئەدمینی تێشتا دادی'}
          </h2>
          <p className="text-xs text-[var(--text-light)] mt-1.5 max-w-xs">
            تکایە وشەی نهێنی بنووسە بۆ بەڕێوەبردنی خواردنەکان و ڕێکخستنەکان
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-light)] mb-1.5">
              وشەی نهێنی (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-[var(--text-light)]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={t.adminPasswordPlaceholder || 'وشەی نهێنی بنووسە...'}
                className={`w-full ps-9 pe-10 py-3.5 rounded-xl bg-[var(--tab-bg)] border text-sm text-[var(--text-dark)] outline-none transition-all ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-[var(--border-accent)] focus:border-[#9E121E]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-3 flex items-center text-[var(--text-light)] hover:text-[var(--text-dark)]"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-500 text-center animate-shake bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
              {t.wrongPassword || 'وشەی نهێنی نادروستە! تکایە دووبارە هەوڵبدەرەوە.'}
            </p>
          )}

          {/* Secure Submit Button ONLY */}
          <button
            type="submit"
            disabled={isVerifying || !password.trim()}
            className="w-full py-3.5 bg-[#9E121E] hover:bg-[#7C0A11] text-white font-black rounded-xl text-sm shadow-lg shadow-[#9E121E]/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{t.loginBtn || 'چوونا ژوورە'}</span>
          </button>
        </form>

        {/* Back to Public Customer Menu */}
        <div className="mt-6 pt-5 border-t border-[var(--border-accent)] text-center">
          <button
            type="button"
            onClick={onGoToCustomerMenu}
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-light)] hover:text-[#9E121E] dark:hover:text-[#E6BC73] transition-colors"
          >
            <span>گەڕانەوە بۆ مینیۆی کڕیاران (Customer Menu)</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
