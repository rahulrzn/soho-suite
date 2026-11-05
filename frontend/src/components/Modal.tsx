import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    const firstControl = dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea, [href]')
    firstControl?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]')]
      if (!controls.length) return
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      previous?.focus()
    }
  }, [])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current() }}>
    <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} ref={dialogRef}>
      <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><button type="button" className="modal-close" aria-label="Close dialog" onClick={() => onCloseRef.current()}>×</button></div>
      {children}
    </div>
  </div>
}

export function ConfirmDialog({ title, description, confirmLabel, destructive, busy, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; destructive?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal title={title} description={description} onClose={onCancel}><div className="modal-actions"><button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className={destructive ? 'button-danger' : 'button-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button></div></Modal>
}
