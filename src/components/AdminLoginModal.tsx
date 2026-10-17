import React, { useState } from 'react';
import { TranslationStrings } from '../types';
import { Lock, Eye, EyeOff, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { verifyPassword } from '../services/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: TranslationStrings;
  storedHash?: string;
  storedSalt?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  t,
  storedHash,
  storedSalt
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

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
      console.error("Auth verification error:", err);
      setError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A0304]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--card-bg)] border-2 border-[var(--border-accent)] w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scaleUp text-[var(--text-dark)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-[var(--text-light)] hover:text-[var(--text-dark)] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#9E121E]/10 dark:bg-[#E6BC73]/15 text-[#9E121E] dark:text-[#E6BC73] flex items-center justify-center mb-3 border border-[#9E121E]/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-[var(--text-dark)]">
            {t.adminLoginTitle}
          </h3>
          <p className="text-xs text-[var(--text-light)] mt-1">
            تکایە وشەی نهێنی بنووسە بۆ چوونەژوورەوە
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder={t.adminPasswordPlaceholder || "باسوۆردێ ئەدمینی لێرە بنڤیسە..."}
              className={`w-full ps-9 pe-10 py-3 rounded-xl bg-[var(--tab-bg)] border text-sm text-[var(--text-dark)] outline-none transition-all ${
                error
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-[var(--border-accent)] focus:border-[#9E121E]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-3 flex items-center text-[var(--text-light)] hover:text-[var(--text-dark)]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-500 text-center animate-shake">
              {t.wrongPassword}
            </p>
          )}

          {/* Standard Red Login Button ONLY */}
          <button
            type="submit"
            disabled={isVerifying || !password.trim()}
            className="w-full py-3 bg-[#9E121E] hover:bg-[#7C0A11] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#9E121E]/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isVerifying && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{t.loginBtn}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
