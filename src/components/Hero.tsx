import React from 'react';
import { ArrowRight, Compass, Sparkles, Network, Brain, ShieldAlert, BookOpen } from 'lucide-react';
import { ThreeCodeSphere } from './ThreeCodeSphere';

interface HeroProps {
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, onHowItWorksClick }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#EEF5FF] to-[#F8FAFC] pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-200/60">
      {/* Subtle ambient glowing background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-200/40 via-cyan-200/30 to-transparent blur-3xl pointer-events-none rounded-full" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold tracking-wide uppercase text-blue-800">
                Next-Gen Codebase Intelligence
              </span>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#101828] leading-[1.12]">
              Every Codebase Has a Story.{' '}
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent block mt-1">
                Discover It.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
              Turn complex repositories into interactive architecture maps, intelligent explanations and personalized developer learning journeys.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExploreClick}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-base shadow-md shadow-blue-500/25 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200 cursor-pointer"
              >
                Explore Your Codebase
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onHowItWorksClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-700 font-semibold text-base border border-slate-200/80 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-blue-600" />
                See How It Works
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600">
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">3D Architecture</div>
                  <div className="text-[11px] text-slate-500">Live Graph Maps</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center border border-cyan-100 text-cyan-600">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">AI Code Tutor</div>
                  <div className="text-[11px] text-slate-500">Grounded Context</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Learning Path</div>
                  <div className="text-[11px] text-slate-500">Mastery Quizzes</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Blast Radius</div>
                  <div className="text-[11px] text-slate-500">Change Impact</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: 3D Codebase Universe */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full relative">
              <ThreeCodeSphere />

              {/* Floating Glass Badges */}
              <div className="absolute top-4 -left-2 sm:left-4 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">Living Ecosystem</span>
                  <span className="text-slate-500 block text-[10px]">Real-time AST extraction</span>
                </div>
              </div>

              <div className="absolute bottom-6 -right-2 sm:right-6 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">4,200+ Repositories</span>
                  <span className="text-slate-500 block text-[10px]">Indexed & Visualized</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Subtle Animated Scroll Indicator */}
        <div className="mt-12 flex flex-col items-center justify-center">
          <button
            onClick={onExploreClick}
            aria-label="Scroll down to repository analysis"
            className="group flex flex-col items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-medium tracking-wider uppercase text-slate-400 group-hover:text-blue-600">
              Scroll to Explore
            </span>
            <div className="w-5 h-9 rounded-full border-2 border-slate-300 group-hover:border-blue-500 flex items-start justify-center p-1 transition-colors">
              <div className="w-1.5 h-2 bg-blue-600 rounded-full animate-bounce" />
            </div>
          </button>
        </div>

      </div>
    </section>
  );
};
