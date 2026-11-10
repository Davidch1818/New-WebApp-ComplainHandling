import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Building2, RefreshCw, CheckCircle } from 'lucide-react';
import '../index.css';

const generateCaptcha = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const LoginPage = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaText, setCaptchaText] = useState(generateCaptcha());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (captcha.toUpperCase() !== captchaText.toUpperCase()) {
      setError('invalid credential');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(userId, password);
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        if (Array.isArray(result.error)) {
          setError(result.error.map(e => e.msg || 'Validation error').join(', '));
        } else if (typeof result.error === 'object' && result.error !== null) {
          setError(JSON.stringify(result.error));
        } else {
          setError(result.error || 'Login failed.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-on-surface">
      {/* Header */}
      <header className="w-full flex justify-center p-6 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <Building2 size={32} color="var(--color-primary)" />
          <span className="text-2xl font-bold text-primary tracking-tight">
            Internal Web Application Portal
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-[440px] p-8 flex flex-col gap-6 shadow-sm bg-surface border border-outline-variant rounded-xl">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-1 text-on-surface">
              Welcome Back
            </h1>
            <p className="text-base text-on-surface-variant">
              Sign in to your secure enterprise portal.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-error/10 text-error border border-error/20 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {user ? (
            <div className="flex flex-col items-center justify-center gap-6 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-on-surface mb-2">Already Logged In</h2>
                <p className="text-on-surface-variant">
                  You are currently signed in as <strong>{user.full_name || user.user_id}</strong>.
                </p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                <button
                  onClick={() => navigate('/')}
                  className="w-full h-12 font-medium text-sm rounded-lg bg-primary text-white hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => logout()}
                  className="w-full h-12 font-medium text-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">
                  User ID / Email Address
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  placeholder="Enter your user ID"
                  className="h-12 px-4 text-base w-full border border-outline-variant rounded-lg font-sans outline-none transition-colors focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-on-surface">
                    Password
                  </label>
                  {/* <a href="#" className="text-primary text-sm font-medium hover:underline">
                    Forgot Password?
                  </a> */}
                </div>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="h-12 pl-4 pr-12 text-base w-full border border-outline-variant rounded-lg font-sans outline-none transition-colors focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface">
                  Security Verification
                </label>
                <div className="flex gap-2">
                  <div className="flex-grow h-12 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,var(--color-primary)_1px,transparent_1px)] bg-[length:8px_8px]"></div>
                    <span className="font-mono font-bold italic tracking-widest text-on-surface-variant text-xl z-10 select-none">{captchaText}</span>
                  </div>
                  <button type="button" className="w-12 h-12 flex items-center justify-center border border-outline-variant rounded-lg text-on-surface-variant bg-surface hover:bg-surface-container-high transition-colors"
                    onClick={() => setCaptchaText(generateCaptcha())}
                    title="Refresh CAPTCHA">
                    <RefreshCw size={20} />
                  </button>
                </div>
                <input
                  type="text"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  placeholder="Enter characters shown above"
                  className="h-12 px-4 text-base w-full border border-outline-variant rounded-lg font-sans outline-none transition-colors focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || authLoading}
                className="w-full h-12 mt-2 font-medium text-sm rounded-lg bg-primary text-white hover:bg-primary-container hover:text-on-primary-container disabled:opacity-70 disabled:cursor-not-allowed transition-colors active:scale-95 flex items-center justify-center"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* {!user && (
            <p className="text-center text-base text-on-surface-variant mt-2">
              Don't have an account?{' '}
              <a href="#" className="text-primary text-sm font-medium hover:underline">
                Contact Administrator
              </a>
            </p>
          )} */}
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="w-full px-8 py-6 bg-surface-container-low border-t border-outline-variant flex flex-wrap justify-between items-center gap-4">
        <div className="text-sm text-on-surface">
          © 2024 ResolverHQ. Secure Enterprise Portal.
        </div>
        <nav className="flex gap-6 flex-wrap">
          <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            Terms of Service
          </a>
          <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            Contact Support
          </a>
        </nav>
      </footer> */}
    </div>
  );
};

export default LoginPage;