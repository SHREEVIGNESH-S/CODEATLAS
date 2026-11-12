import React, { useState } from 'react';
import {
  LearningMilestone,
  QuizQuestion
} from '../types/codeatlas';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Clock,
  FileCode,
  Flame,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface LearningPathProps {
  milestones: LearningMilestone[];
  repoName: string;
  onExploreFile: (path: string) => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  milestones,
  repoName,
  onExploreFile
}) => {
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>(
    milestones[0]?.id || ''
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(
    new Set([milestones[0]?.id || ''])
  );

  const activeMilestone = milestones.find((m) => m.id === activeMilestoneId) || milestones[0];

  const handleSelectAnswer = (milestoneId: string, optionIndex: number) => {
    if (quizSubmitted[milestoneId]) return;
    setQuizAnswers((prev) => ({ ...prev, [milestoneId]: optionIndex }));
  };

  const handleSubmitQuiz = (milestoneId: string, quiz: QuizQuestion) => {
    const selected = quizAnswers[milestoneId];
    if (selected === undefined) return;

    setQuizSubmitted((prev) => ({ ...prev, [milestoneId]: true }));
    if (selected === quiz.correctIndex) {
      setCompletedMilestones((prev) => new Set([...prev, milestoneId]));
    }
  };

  const masteryPercent = Math.round(
    (completedMilestones.size / (milestones.length || 1)) * 100
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-8">
      
      {/* Top Banner & Mastery Progress Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Intelligent Codebase Curriculum
          </div>
          <h2 className="text-2xl font-bold text-[#101828]">
            Developer Onboarding Journey: {repoName}
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            A structured, concept-driven roadmap to master the architectural flow, design patterns, and critical invariants of this codebase.
          </p>
        </div>

        {/* Codebase Mastery Meter */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-200/70 min-w-[240px]">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              Codebase Mastery
            </span>
            <span className="text-blue-700">{masteryPercent}%</span>
          </div>

          <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${masteryPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>{completedMilestones.size} of {milestones.length} Milestones</span>
            <span className="text-emerald-600 font-semibold">
              {masteryPercent === 100 ? 'Architect Certified' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* 3D-Inspired Connected Pathway */}
      <div className="relative py-4">
        {/* Connection pipeline track */}
        <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full hidden lg:block z-0" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {milestones.map((m, idx) => {
            const isCompleted = completedMilestones.has(m.id);
            const isActive = activeMilestoneId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => setActiveMilestoneId(m.id)}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative ${
                  isActive
                    ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20 -translate-y-1'
                    : isCompleted
                    ? 'bg-white border-emerald-200 hover:border-emerald-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Milestone Node Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Stage {m.stage}
                  </span>
                  
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  ) : isActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      <PlayCircle className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-[#101828] mb-1 line-clamp-1">{m.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{m.concept}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {m.estimatedTime}
                  </span>
                  <span className="font-semibold text-blue-600">{m.difficulty}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Milestone Deep-Dive & Interactive Knowledge Checkpoint */}
      {activeMilestone && (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {activeMilestone.stageTitle}
              </span>
              <h3 className="text-xl font-bold text-[#101828] mt-0.5">
                {activeMilestone.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {activeMilestone.estimatedTime}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200">
                {activeMilestone.difficulty} Level
              </span>
            </div>
          </div>

          {/* Core Concept & Key Architectural Takeaways */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Architectural Invariants & Takeaways
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {activeMilestone.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Target Files to Inspect */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                Recommended Files to Inspect
              </h4>
              <div className="space-y-2">
                {activeMilestone.targetFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                  >
                    <span className="font-mono text-slate-800 font-medium truncate">{file}</span>
                    <button
                      onClick={() => onExploreFile(file)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold ml-2 cursor-pointer"
                    >
                      Inspect <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Knowledge Checkpoint Quiz */}
          <div className="bg-white p-6 rounded-xl border border-blue-200/90 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Knowledge Checkpoint</h4>
                  <p className="text-xs text-slate-500">Verify your architectural understanding</p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Target: {activeMilestone.quiz.conceptTag}
              </span>
            </div>

            <div className="text-sm font-semibold text-slate-900 leading-snug">
              {activeMilestone.quiz.question}
            </div>

            {/* Quiz Options */}
            <div className="space-y-2.5">
              {activeMilestone.quiz.options.map((option, optIdx) => {
                const isSelected = quizAnswers[activeMilestone.id] === optIdx;
                const isSubmitted = quizSubmitted[activeMilestone.id];
                const isCorrect = optIdx === activeMilestone.quiz.correctIndex;

                let optionStyle = 'border-slate-200 hover:border-slate-300 bg-white text-slate-800';
                if (isSubmitted) {
                  if (isCorrect) {
                    optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                  } else if (isSelected) {
                    optionStyle = 'border-rose-400 bg-rose-50 text-rose-900';
                  }
                } else if (isSelected) {
                  optionStyle = 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectAnswer(activeMilestone.id, optIdx)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs leading-relaxed transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {isSubmitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit / Feedback Button */}
            {!quizSubmitted[activeMilestone.id] ? (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSubmitQuiz(activeMilestone.id, activeMilestone.quiz)}
                  disabled={quizAnswers[activeMilestone.id] === undefined}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Submit Answer
                </button>
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  quizAnswers[activeMilestone.id] === activeMilestone.quiz.correctIndex
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="font-bold mb-1">
                  {quizAnswers[activeMilestone.id] === activeMilestone.quiz.correctIndex
                    ? '✓ Correct Architectural Insight!'
                    : 'Architectural Analysis Explanation:'}
                </div>
                <p>{activeMilestone.quiz.explanation}</p>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
