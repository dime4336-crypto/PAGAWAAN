import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Code2, ExternalLink, X } from 'lucide-react';
import { SHOWCASE_PROJECTS, type ShowcaseProject } from '../config/workshop';

interface WorkshopShowcaseProps {
  onRequestWebProject: (projectTitle: string) => void;
}

export function WorkshopShowcase({ onRequestWebProject }: WorkshopShowcaseProps) {
  const prefersReducedMotion = useReducedMotion();
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section
      id="showcase"
      className="border-b border-[#EDE6D6]/10 bg-[#1B1917] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-[#EDE6D6]/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-[#D97724]">
              05 · Built in the Workshop
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
              Software &amp; web systems built here.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#A39B8B] sm:text-base">
              Pagawaan builds custom websites, internal dashboards, and Python automation. The
              platform you are browsing is live; additional case studies below are clearly labeled
              demonstration builds illustrating system capabilities.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestWebProject('Custom Website / Software Project')}
            className="inline-flex min-h-[44px] items-center gap-2 self-start border border-[#D97724] bg-[#D97724] px-5 py-2.5 text-xs font-semibold text-[#141312] whitespace-nowrap transition-colors hover:bg-[#e58432] lg:self-auto"
          >
            <span>Commission a Website</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {SHOWCASE_PROJECTS.map((project, idx) => {
            const isLive = project.classification === 'Live Platform';
            return (
              <article
                key={project.id}
                className="flex flex-col justify-between border border-[#EDE6D6]/12 bg-[#141312] transition-colors duration-150 hover:border-[#D97724]/55"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#EDE6D6]/10 bg-[#23201D]">
                    {!failedImages[project.id] ? (
                      <img
                        src={project.imageUrl}
                        alt={project.imageAlt}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [project.id]: true }))
                        }
                        className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#23201D] to-[#141312] p-6 text-center">
                        <Code2 className="h-7 w-7 text-[#D97724]" aria-hidden="true" />
                        <span className="text-sm font-medium text-[#EDE6D6]">{project.title}</span>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141312]/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-medium ${
                          isLive ? 'text-[#5C8D76]' : 'text-[#D97724]'
                        }`}
                      >
                        {project.classification}
                      </span>
                      <span className="font-mono text-[#A39B8B]">0{idx + 1}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="text-xs text-[#A39B8B]">{project.category}</div>
                    <h3 className="mt-1 font-display text-xl font-bold text-[#EDE6D6]">
                      {project.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#A39B8B]">
                      {project.summary}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-[#EDE6D6]/80">
                      {project.stack.map((tech, techIdx) => (
                        <span key={tech} className="inline-flex items-center gap-2">
                          {techIdx > 0 && (
                            <span className="text-[#A39B8B]/50" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <span>{tech}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE6D6]/10 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    data-cursor-label="Inspect Build"
                    className="min-h-[40px] border border-[#EDE6D6]/20 bg-[#1B1917] px-4 py-2 text-xs font-medium text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    Inspect Architecture
                  </button>

                  {project.liveUrl ? (
                    <a
                      href={project.liveUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D97724] hover:underline"
                    >
                      <span>Live Active Site</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-[#A39B8B]">Demonstration Showcase</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Interactive Showcase Inspection Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="showcase-modal-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto border border-[#EDE6D6]/20 bg-[#1B1917] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#EDE6D6]/10 pb-4">
                <div>
                  <div className="text-xs font-medium text-[#D97724]">
                    {selectedProject.classification} · {selectedProject.category}
                  </div>
                  <h3
                    id="showcase-modal-title"
                    className="mt-1 font-display text-xl font-bold text-[#EDE6D6]"
                  >
                    {selectedProject.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close project preview"
                  className="flex h-10 w-10 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:text-[#EDE6D6]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <p className="leading-relaxed text-[#EDE6D6]/90">{selectedProject.summary}</p>
                <div className="border border-[#EDE6D6]/10 bg-[#141312] p-4 text-xs leading-relaxed text-[#A39B8B]">
                  <div className="font-medium text-[#EDE6D6]">Technical Notes</div>
                  <p className="mt-1">{selectedProject.architectureNotes}</p>
                </div>

                <div className="divide-y divide-[#EDE6D6]/10 border border-[#EDE6D6]/10 bg-[#141312]">
                  {selectedProject.interactiveSpecs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
                    >
                      <span className="text-[#A39B8B]">{spec.label}</span>
                      <span className="text-right font-medium text-[#EDE6D6]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#EDE6D6]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="min-h-[40px] border border-[#EDE6D6]/20 px-4 py-2 text-xs text-[#EDE6D6]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const title = selectedProject.title;
                    setSelectedProject(null);
                    onRequestWebProject(title);
                  }}
                  className="min-h-[40px] border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312]"
                >
                  Request Similar System
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
