/* eslint-disable react-hooks/set-state-in-effect -- The effect loads backend activity when the business or page changes. */
import { useCallback, useEffect, useState } from 'react'
import { getActivity } from '../api/activityApi'
import { formatApiError } from '../api/formatError'
import type { ActivityEvent } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { EmptyState, LoadingLine } from '../components/Feedback'
import type { PageCallbacks } from './types'

const pageSize = 20

export function ActivityPage({ onError }: PageCallbacks) {
  const { business } = useWorkspace()
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<ActivityEvent[]>([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(true)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const result = await getActivity(business.id, page, pageSize)
      setItems(result.items)
      setTotal(result.total)
    } catch (error) { setItems([]); onError(formatApiError(error)) }
    finally { setBusy(false) }
  }, [business.id, page, onError])
  useEffect(() => { void load() }, [load])

  return <div className="feature-stack">
    <section className="content-panel panel-pad">
      <div className="panel-heading"><div><p className="section-label">BUSINESS HISTORY</p><h2>Changes in this workspace</h2><p>Events recorded for this business, ordered from newest to oldest.</p></div><span className="status-tag status-muted">{total.toLocaleString()} events</span></div>
      {busy ? <LoadingLine text="Loading business activity…" /> : items.length ? <ol className="activity-list activity-full">{items.map((event) => <li key={event.id} className="activity-line"><span className="activity-dot" aria-hidden="true"/><div><p>{event.summary}</p><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time><small>{event.targetType ? `${event.targetType}${event.targetId ? ` · ${event.targetId}` : ''}` : event.action.replaceAll('_', ' ').toLowerCase()}</small></div><span className="activity-action">{event.action.replaceAll('_', ' ').toLowerCase()}</span></li>)}</ol> : <EmptyState title="No activity recorded yet" description="When supported changes are made to this business, they will appear here. This feed does not have filters in the current API." />}
      <div className="pagination-row"><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><div className="inline-actions"><button className="button-secondary button-small" disabled={busy || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><button className="button-secondary button-small" disabled={busy || (page + 1) * pageSize >= total} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    </section>
  </div>
}
