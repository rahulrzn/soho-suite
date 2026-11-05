/* eslint-disable react-hooks/set-state-in-effect -- The effect loads backend activity when the business or page changes. */
import { useCallback, useEffect, useState } from 'react'
import { getActivity } from '../api/activityApi'
import { formatApiError } from '../api/formatError'
import type { ActivityEvent, BusinessMember } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { LoadingLine } from '../components/Feedback'
import { ActivityScreen } from '../soho/screens/activity-screen'
import type { ActivityEvent as MockActivityEvent } from '../soho/types'
import type { PageCallbacks } from './types'

const pageSize = 20

export function ActivityPage({ onError }: PageCallbacks) {
  const { business, profile, members } = useWorkspace()
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
    } catch (error) {
      setItems([])
      onError(formatApiError(error))
    } finally {
      setBusy(false)
    }
  }, [business.id, page, onError])

  useEffect(() => {
    void load()
  }, [load])

  const screenEvents: MockActivityEvent[] = items.map((event) => {
    const occurredAt = new Date(event.occurredAt)
    const isCurrentUser = Number(event.actorUserId) === Number(profile.id)
    const member = members.find((m) => Number(m.userId) === Number(event.actorUserId))

    const actorName = isCurrentUser
      ? `${profile.firstName} ${profile.lastName}`.trim() || profile.username || 'You'
      : member
      ? `${member.firstName} ${member.lastName}`.trim() || member.username
      : event.actorUserId !== null
      ? `User #${event.actorUserId}`
      : 'System Automation'

    const initials = isCurrentUser
      ? `${(profile.firstName || '').trim().charAt(0)}${(profile.lastName || '').trim().charAt(0)}`.toUpperCase() || (profile.username || 'U').charAt(0).toUpperCase()
      : member
      ? `${(member.firstName || '').trim().charAt(0)}${(member.lastName || '').trim().charAt(0)}`.toUpperCase() || (member.username || 'M').charAt(0).toUpperCase()
      : event.actorUserId !== null
      ? 'U'
      : 'SA'

    const target = formatTarget(event, members)
    const actionText = formatAction(event.action)

    // Filter out boilerplate repetitive summaries (e.g. "Business member added", "Business invitation created")
    const summaryLower = (event.summary || '').toLowerCase().trim()
    const isBoilerplate =
      !summaryLower ||
      summaryLower === actionText.toLowerCase() ||
      summaryLower.startsWith('business ') ||
      summaryLower.startsWith('member ') ||
      summaryLower.startsWith('invitation ') ||
      summaryLower.startsWith('dataset ') ||
      summaryLower.startsWith('expense ') ||
      summaryLower.startsWith('inventory ')

    const detailText = isBoilerplate ? '' : event.summary

    return {
      id: String(event.id),
      actor: actorName,
      actorInitials: initials,
      action: actionText,
      target,
      module: activityModule(event.action),
      day: occurredAt.toLocaleDateString(),
      time: occurredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      detail: detailText,
      isCurrentUser,
    }
  })

  return (
    <div className="feature-stack">
      {busy ? (
        <section className="content-panel panel-pad">
          <LoadingLine text="Loading business activity…" />
        </section>
      ) : (
        <ActivityScreen events={screenEvents} />
      )}
      <div className="pagination-row">
        <span>
          {total.toLocaleString()} events · Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="inline-actions">
          <button
            className="button-secondary button-small"
            disabled={busy || page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          <button
            className="button-secondary button-small"
            disabled={busy || (page + 1) * pageSize >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function formatAction(action: string): string {
  switch (action) {
    case 'MEMBER_ADDED':
      return 'added workspace member'
    case 'MEMBER_ROLE_UPDATED':
      return 'updated role for'
    case 'MEMBER_REMOVED':
      return 'removed workspace member'
    case 'INVITATION_CREATED':
      return 'sent invite'
    case 'INVITATION_RESENT':
      return 'rotated invite token for'
    case 'INVITATION_REVOKED':
      return 'revoked invite'
    case 'INVITATION_ACCEPTED':
      return 'accepted workspace invite'
    case 'OWNERSHIP_TRANSFER_REQUESTED':
      return 'requested ownership transfer'
    case 'OWNERSHIP_TRANSFER_ACCEPTED':
      return 'accepted ownership transfer'
    case 'OWNERSHIP_TRANSFER_REVOKED':
      return 'cancelled ownership transfer'
    case 'DATASET_UPLOADED':
      return 'uploaded sales dataset'
    case 'DATASET_IMPORTED':
    case 'DATASET_CONFIRMED':
      return 'confirmed dataset import'
    case 'DATASET_DELETED':
      return 'deleted dataset'
    case 'DATASET_METADATA_UPDATED':
    case 'DATASET_UPDATED':
      return 'updated dataset schema'
    case 'ANALYTICS_CONFIGURED':
      return 'configured sales telemetry'
    case 'HEALTH_INPUTS_UPDATED':
      return 'updated business health inputs'
    case 'EXPENSE_RECORDED':
    case 'EXPENSE_CREATED':
      return 'recorded expense'
    case 'EXPENSE_UPDATED':
      return 'updated expense'
    case 'EXPENSE_DELETED':
      return 'deleted expense'
    case 'INVENTORY_ITEM_CREATED':
      return 'added catalog product'
    case 'INVENTORY_ITEM_UPDATED':
      return 'updated catalog product'
    case 'INVENTORY_OPENING_STOCK':
      return 'recorded opening stock'
    case 'INVENTORY_MOVEMENT_RECORDED':
      return 'recorded stock movement'
    case 'BUSINESS_CREATED':
      return 'created business workspace'
    case 'BUSINESS_UPDATED':
      return 'updated workspace settings'
    case 'BUSINESS_DELETED':
      return 'deleted business workspace'
    default:
      return action.toLowerCase().replaceAll('_', ' ')
  }
}

function formatTarget(event: ActivityEvent, members: BusinessMember[]): string {
  if (event.targetType === 'MEMBERSHIP' && event.targetId) {
    const member = members.find((m) => String(m.userId) === String(event.targetId))
    if (member) return `${member.firstName} ${member.lastName}`.trim() || member.username || `User #${event.targetId}`
    return `User #${event.targetId}`
  }
  if (event.targetType === 'INVITATION' && event.targetId) {
    return `Invitation #${event.targetId}`
  }
  if (event.targetType === 'OWNERSHIP_TRANSFER' && event.targetId) {
    return `Transfer #${event.targetId}`
  }
  if (event.targetType === 'DATASET' && event.targetId) {
    return `Dataset #${event.targetId}`
  }
  if (event.targetType === 'EXPENSE' && event.targetId) {
    return `Expense #${event.targetId}`
  }
  if (event.targetType === 'INVENTORY_ITEM' && event.targetId) {
    return `Product #${event.targetId}`
  }
  if (event.targetType && event.targetId) {
    return `${event.targetType.toLowerCase().replace('_', ' ')} #${event.targetId}`
  }
  return ''
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
