/* eslint-disable react-hooks/set-state-in-effect -- The effect loads backend activity when the business or page changes. */
import { useCallback, useEffect, useState } from 'react'
import { getActivity } from '../api/activityApi'
import { formatApiError } from '../api/formatError'
import type { ActivityEvent } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { LoadingLine } from '../components/Feedback'
import { ActivityScreen } from '../soho/screens/activity-screen'
import type { ActivityEvent as MockActivityEvent } from '../soho/types'
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

  const screenEvents: MockActivityEvent[] = items.map((event) => {
    const occurredAt = new Date(event.occurredAt)
    return {
      id: String(event.id),
      actor: event.actorUserId === null ? 'Unknown user' : `User #${event.actorUserId}`,
      actorInitials: event.actorUserId === null ? '?' : 'U',
      action: event.summary,
      target: '',
      module: activityModule(event.action),
      day: occurredAt.toLocaleDateString(),
      time: occurredAt.toLocaleTimeString(),
      detail: event.action.toLowerCase().replaceAll('_', ' '),
    }
  })

  return <div className="feature-stack">
    {busy ? <section className="content-panel panel-pad"><LoadingLine text="Loading business activity…" /></section> : <ActivityScreen events={screenEvents} />}
    <div className="pagination-row"><span>{total.toLocaleString()} events · Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><div className="inline-actions"><button className="button-secondary button-small" disabled={busy || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><button className="button-secondary button-small" disabled={busy || (page + 1) * pageSize >= total} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
  </div>
}

function activityModule(action: string): MockActivityEvent['module'] {
  const value = action.toLowerCase()
  if (value.includes('dataset')) return 'Datasets'
  if (value.includes('expense')) return 'Expenses'
  if (value.includes('inventory') || value.includes('stock')) return 'Inventory'
  if (value.includes('report') || value.includes('export')) return 'Reports'
  if (value.includes('member') || value.includes('invitation')) return 'Team'
  return 'Settings'
}
