import { useEffect } from 'react'

export function Message({ variant, text, onDismiss }: { variant: 'error' | 'success' | 'warning'; text: string; onDismiss?: () => void }) {
  return <div className={`feedback feedback-${variant}`} role={variant === 'error' ? 'alert' : 'status'}><span className="feedback-mark" aria-hidden="true">{variant === 'error' ? '!' : variant === 'success' ? '✓' : 'i'}</span><span>{text}</span>{onDismiss && <button type="button" className="feedback-dismiss" aria-label="Dismiss message" onClick={onDismiss}>×</button>}</div>
}

export function Toast({ id, variant, text, onDismiss }: { id: number; variant: 'error' | 'success'; text: string; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(id), 5000)
    return () => window.clearTimeout(timeout)
  }, [id, onDismiss])

  return <div className={`feedback feedback-${variant} toast-item`} role={variant === 'error' ? 'alert' : 'status'}>
    <span className="feedback-mark" aria-hidden="true">{variant === 'error' ? '!' : '✓'}</span>
    <span className="toast-text">{text}</span>
    <button type="button" className="feedback-dismiss" aria-label="Dismiss notification" onClick={() => onDismiss(id)}>×</button>
  </div>
}

export function LoadingLine({ text = 'Loading…' }: { text?: string }) {
  return <div className="loading-line" role="status"><span className="spinner" aria-hidden="true" />{text}</div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">S</span><h2>{title}</h2><p>{description}</p>{action}</div>
}
