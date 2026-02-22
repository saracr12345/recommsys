// web/src/pages/SignupForm.tsx (or wherever your original lives)
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { setUser } = useAuth()
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    setMsgType(null)

    try {
      const data = await api<{
        ok: boolean
        user?: { id: number; email: string }
        error?: string
      }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (data.ok && data.user) {
        setUser(data.user)
        setMsgType('success')
        setMsg('✓ Account created! Redirecting…')
        navigate('/welcome')
      } else {
        setMsgType('error')
        setMsg(data.error || 'Sign up failed')
      }
    } catch (err: any) {
      setMsgType('error')
      setMsg(err?.message || 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = email.trim().length > 0 && password.length >= 8

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center px-4 py-8 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-emerald-100/20 rounded-full blur-3xl" />
      </div>

      {/* Form Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Header gradient bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700" />

          <form onSubmit={submit} className="p-8 space-y-6">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
              <p className="text-sm text-slate-600">Start using LLM Advisor with a free account</p>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  required
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-slate-500">We'll never share your email</p>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {password.length === 0
                  ? 'Minimum 8 characters'
                  : password.length < 8
                    ? `${8 - password.length} more characters needed`
                    : '✓ Looks good'}
              </p>
            </div>

            {/* Message */}
            {msg && (
              <div
                className={cn(
                  'p-4 rounded-lg border flex items-start gap-3 text-sm font-medium',
                  msgType === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700',
                )}
              >
                {msgType === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div>{msg}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 text-base',
                submitting || !isFormValid
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl hover:scale-105',
              )}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Login Link (SPA-safe) */}
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Footer (optional; keep or remove) */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                By signing up, you agree to our{' '}
                <span className="text-emerald-600 font-medium">Terms</span> and{' '}
                <span className="text-emerald-600 font-medium">Privacy Policy</span>.
              </p>
            </div>
          </form>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Secure &amp; encrypted</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Free forever</span>
          </div>
        </div>
      </div>
    </div>
  )
}