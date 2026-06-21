import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1e]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        {/* Primary gradient orb */}
        <div className="animate-float absolute -left-[20%] -top-[10%] h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
        {/* Secondary gradient orb */}
        <div className="animate-float-delayed absolute -right-[15%] top-[20%] h-[500px] w-[500px] rounded-full bg-indigo-600/12 blur-[100px]" />
        {/* Accent orb */}
        <div className="animate-float-slow absolute bottom-[-10%] left-[30%] h-[400px] w-[400px] rounded-full bg-cyan-600/10 blur-[80px]" />
        
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial gradient overlay for vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(10,15,30,0.8)_70%,_#0a0f1e_100%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-16">
        {/* Logo & Title */}
        <div className="mb-10 text-center">
          {/* Logo icon */}
          <div className="mx-auto mb-6 flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-gray-900/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-9 w-9 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-white">
            安全生产AI智能管理系统
          </h1>
          <p className="mt-2.5 text-sm font-normal text-gray-400 tracking-wide">
            青岛地铁运营有限公司 · 统一管理平台
          </p>
        </div>

        {/* Login Card - Glass morphism */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
          {/* Card top accent line */}
          <div className="mx-auto mb-7 h-1 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            © 2026 青岛地铁运营有限公司 · 安全生产AI智能管理系统 v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
