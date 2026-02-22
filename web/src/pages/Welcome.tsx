import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Sparkles, ArrowRight, Zap, TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react'

export default function WelcomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayEmail = user?.email ?? 'there'
  const firstName = displayEmail.split('@')[0] || 'there'

  const features = [
    {
      icon: TrendingUp,
      title: 'Model Recommendations',
      description: 'Get AI-powered suggestions tailored to your specific tasks',
    },
    {
      icon: MessageSquare,
      title: 'Community Insights',
      description: 'Connect with other researchers and share knowledge',
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Stay informed with the latest LLM benchmarks and releases',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/20 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Welcome Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mb-8">
            {/* Header gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700" />

            <div className="p-12 space-y-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl shadow-lg">
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                </div>
              </div>

              {/* Welcome Message */}
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                    Welcome, {firstName}! 👋
                  </h1>
                  <p className="text-lg text-slate-600">
                    Your account is all set and ready to explore the world of LLMs
                  </p>
                </div>

                <div className="pt-4 inline-flex items-center justify-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg mx-auto">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account verified and activated</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl p-6 border border-slate-200">
                <p className="text-slate-700 leading-relaxed">
                  Your account is ready. You can now explore LLM research, track feeds,
                  and get model recommendations tailored to your tasks.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/advisor')}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
                >
                  <span>Go to Advisor</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:border-emerald-300 group"
                >
                  <span>Browse Explore</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-slate-600 group-hover:text-emerald-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:border-emerald-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-lg group-hover:from-emerald-200 group-hover:to-emerald-100 transition-all duration-200">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer Help (optional placeholder) */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Need help getting started?{' '}
              <span className="font-semibold text-emerald-600">View our guide</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}