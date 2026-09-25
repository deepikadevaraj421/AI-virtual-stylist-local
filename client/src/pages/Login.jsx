import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Scissors, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <div className="brand-logo">
              <img src="/logo.png" alt="AI Virtual Stylist" className="brand-logo-img" />
            </div>
            <h1>AI Virtual Stylist</h1>
            <p>Your personal AI-powered wardrobe assistant. Get perfect outfit recommendations every day.</p>
            <div className="brand-features">
              <div className="brand-feature">
                <div className="feature-dot" />
                <span>AI-Powered Outfit Matching</span>
              </div>
              <div className="brand-feature">
                <div className="feature-dot" />
                <span>Smart Weekly Planning</span>
              </div>
              <div className="brand-feature">
                <div className="feature-dot" />
                <span>Weather-Aware Suggestions</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="auth-switch">
              Don't have an account? <Link to="/register">Create Account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
