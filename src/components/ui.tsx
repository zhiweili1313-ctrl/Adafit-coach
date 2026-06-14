import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <section onClick={onClick} className={`rounded-lg border border-black/5 bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer active:scale-[.99]' : ''} ${className}`}>{children}</section>
}

export function ProgressBar({ value, color = 'bg-ink', track = 'bg-black/8' }: { value: number; color?: string; track?: string }) {
  return <div className={`h-2 overflow-hidden rounded-full ${track}`}><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

export function Metric({ label, value, target, unit, color = 'bg-cobalt', dark = false }: { label: string; value: number; target: number; unit: string; color?: string; dark?: boolean }) {
  const percent = target ? Math.round(value / target * 100) : 0
  return <div>
    <div className="mb-2 flex min-w-0 items-end justify-between gap-3">
      <span className={`shrink-0 text-xs font-medium ${dark ? 'text-white/60' : 'text-black/55'}`}>{label}</span>
      <span className="min-w-0 text-right text-sm font-bold"><span className="break-all">{value}</span><span className={`ml-1 font-normal ${dark ? 'text-white/45' : 'text-black/40'}`}>/ {target}{unit}</span></span>
    </div>
    <ProgressBar value={percent} color={color} track={dark ? 'bg-white/15' : 'bg-black/8'} />
  </div>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <header className="mb-5 flex items-center justify-between">
    <div><h1 className="text-2xl font-extrabold">{title}</h1>{subtitle && <p className="mt-1 text-sm text-black/45">{subtitle}</p>}</div>
    {action}
  </header>
}

export function ListButton({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: string; onClick?: () => void }) {
  return <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 border-b border-black/6 py-3 text-left last:border-0">
    <span className="grid h-9 w-9 place-items-center rounded-md bg-paper">{icon}</span>
    <span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong>{hint && <small className="block truncate text-black/45">{hint}</small>}</span>
    <ChevronRight size={18} className="text-black/25" />
  </button>
}

export function Segmented<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (value: T) => void }) {
  return <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-black/5 p-1">
    {options.map(option => <button key={option} onClick={() => onChange(option)} className={`min-h-10 rounded-md px-2 text-xs font-bold transition ${value === option ? 'bg-white text-ink shadow-sm' : 'text-black/45'}`}>{option}</button>)}
  </div>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
    <div className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-paper p-5 sm:rounded-xl" onMouseDown={e => e.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={onClose} className="h-10 w-10 rounded-full bg-black/6 text-xl">×</button></div>
      {children}
    </div>
  </div>
}

export const fieldClass = 'mt-1 min-h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-cobalt'
export const primaryButton = 'min-h-12 rounded-lg bg-ink px-5 font-bold text-white active:scale-[.98] disabled:opacity-40'
export const secondaryButton = 'min-h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-bold active:scale-[.98]'
