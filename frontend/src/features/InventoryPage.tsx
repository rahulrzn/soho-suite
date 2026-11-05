/* eslint-disable react-hooks/set-state-in-effect -- Effects load item and movement pages from the backend. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { addInventoryMovement, createInventoryItem, exportInventory, exportInventoryMovements, getInventoryMovements, listInventory, updateInventoryItem } from '../api/inventoryApi'
import { formatApiError } from '../api/formatError'
import type { InventoryItem, InventoryMovement, InventoryMovementType } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { Modal } from '../components/Modal'
import { EmptyState, LoadingLine, Message } from '../components/Feedback'
import { clearIdempotencyKey, resolveIdempotencyKey, type PendingOperation } from '../workspace/idempotency'
import type { PageCallbacks } from './types'
import { saveCsvDownload } from '../utils/download'
import { Copyable, PageHeader } from '../soho/components/misc'
import { cn } from '../lib/utils'

const pageSize = 20
const movementTypes: InventoryMovementType[] = ['OPENING_STOCK', 'RECEIPT', 'ADJUSTMENT', 'DAMAGE', 'COUNT_CORRECTION']
const pendingMovements = new Map<string, PendingOperation>()

export function InventoryPage({ onError, onNotice }: PageCallbacks) {
  const { business, role } = useWorkspace()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [history, setHistory] = useState<InventoryMovement[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(0)
  const [modal, setModal] = useState<'create' | 'edit' | 'movement' | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const editable = role === 'OWNER' || role === 'MANAGER'
  const listSequence = useRef(0)
  const storage = safeSessionStorage()

  const load = useCallback(async () => {
    const sequence = ++listSequence.current
    setLoading(true)
    try {
      const result = await listInventory(business.id, page, pageSize, activeFilter === 'all' ? undefined : activeFilter === 'active')
      if (sequence === listSequence.current) { setItems(result.items); setTotal(result.total); setSelected((current) => current ? result.items.find((item) => item.id === current.id) ?? current : null) }
    } catch (error) { if (sequence === listSequence.current) { setItems([]); setTotal(0); onError(messageOf(error)) } }
    finally { if (sequence === listSequence.current) setLoading(false) }
  }, [business.id, page, activeFilter, onError])
  useEffect(() => { void load() }, [load])

  const loadHistory = useCallback(async () => {
    if (!selected) { setHistory([]); setHistoryTotal(0); return }
    try {
      const result = await getInventoryMovements(business.id, selected.id, historyPage, pageSize)
      setHistory(result.items); setHistoryTotal(result.total)
    } catch (error) { setHistory([]); setHistoryTotal(0); onError(messageOf(error)) }
  }, [business.id, selected, historyPage, onError])
  useEffect(() => { void loadHistory() }, [loadHistory])

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || busy) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const sku = String(form.get('sku')).trim() || undefined
    const description = String(form.get('description')).trim() || undefined
    const active = form.get('active') === 'on'
    const openingQuantity = String(form.get('openingQuantity')).trim() || undefined
    setBusy(true); onError('')
    try {
      if (modal === 'edit' && selected) {
        await updateInventoryItem(business.id, selected.id, { name, sku, description, active })
        onNotice('Inventory item updated.')
      } else {
        await createInventoryItem(business.id, { name, sku, description, openingQuantity })
        onNotice('Inventory item created.')
      }
      setModal(null); await load()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }

  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || !selected || busy) return
    const form = new FormData(event.currentTarget)
    const body = { type: String(form.get('type')) as InventoryMovementType, quantity: String(form.get('quantity')).trim(), reason: String(form.get('reason')).trim() }
    if (!/^-?\d{1,15}(\.\d{1,4})?$/.test(body.quantity) || !body.reason) { onError('Enter a valid quantity with up to 15 integer digits and 4 decimal places, and give the movement a reason.'); return }
    if (body.type !== 'ADJUSTMENT' && Number(body.quantity) < 0) { onError('For this movement type, enter a non-negative quantity.'); return }
    const scope = 'inventory-movement:' + business.id + ':' + selected.id
    const key = resolveIdempotencyKey({ scope, fingerprint: [body.type, body.quantity, body.reason].join('\u0000'), memory: pendingMovements, storage })
    setBusy(true); onError('')
    try {
      await addInventoryMovement(business.id, selected.id, body, key)
      clearIdempotencyKey(scope, pendingMovements, storage)
      setModal(null); setHistoryPage(0); onNotice('Stock movement recorded by the backend.')
      await load()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }

  async function download(kind: 'inventory' | 'movements') {
    if (downloadBusy) return
    setDownloadBusy(true)
    try {
      const result = kind === 'inventory' ? await exportInventory(business.id) : await exportInventoryMovements(business.id, selected?.id)
      saveCsvDownload(result, 'soho-' + kind + '.csv'); onNotice('CSV download started.')
    } catch (error) { onError(messageOf(error)) }
    finally { setDownloadBusy(false) }
  }

  return <div className="feature-stack">
    <PageHeader eyebrow="Inventory catalogue" title="Inventory" description="Manage item records and trace stock changes through the backend movement ledger." actions={<div className="inline-actions"><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('inventory')}>{downloadBusy ? 'Preparing CSV…' : 'Inventory CSV'}</button><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('movements')}>Movement CSV</button>{editable && <button className="button-primary" onClick={() => setModal('create')}>Add item</button>}</div>} />
    {!editable && <Message variant="warning" text="Your role can view inventory and movement history. An owner or manager can change stock." />}
    <div className="inventory-layout">
      <section className="content-panel panel-pad inventory-list-panel">
        <div className="panel-heading">
          <div>
            <p className="section-label">Stock items</p>
            <h2>Items catalogue</h2>
            <p>{total.toLocaleString()} total items recorded</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            Status
            <select
              className="rounded-md border border-input bg-surface px-2.5 py-1 text-xs text-foreground font-medium"
              value={activeFilter}
              onChange={(event) => { setActiveFilter(event.target.value as typeof activeFilter); setPage(0) }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All items</option>
            </select>
          </label>
        </div>
        {loading ? (
          <LoadingLine text="Loading inventory items…" />
        ) : items.length ? (
          <div className="table-wrap">
            <table className="data-table inventory-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">On hand</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selected?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-primary-soft/50 font-medium" : "hover:bg-surface-sunken/60"
                      )}
                      onClick={() => { setSelected(item); setHistory([]); setHistoryTotal(0); setHistoryPage(0) }}
                    >
                      <td>
                        <div className="space-y-0.5">
                          <strong className="block text-sm font-semibold text-foreground">{item.name}</strong>
                          <small className="block font-mono text-[0.68rem] text-muted-foreground">{item.sku || 'No SKU'}</small>
                        </div>
                      </td>
                      <td className="text-right font-mono font-bold text-foreground">{quantity(item.quantity)}</td>
                      <td className="text-right">
                        <span className={item.active ? 'status-tag' : 'status-tag status-muted'}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No inventory items"
            description="Add an item with its opening quantity to start tracking stock."
            action={editable ? <button className="button-primary" onClick={() => setModal('create')}>Add inventory item</button> : undefined}
          />
        )}
        <div className="pagination-row">
          <span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          <div className="inline-actions">
            <button className="button-secondary button-small" disabled={loading || page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
            <button className="button-secondary button-small" disabled={loading || (page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </section>

      <section className="content-panel panel-pad inventory-detail-panel">
        {selected ? (
          <>
            <div className="panel-heading border-b border-border/70 pb-4">
              <div>
                <p className="section-label">Selected item</p>
                <h2>{selected.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selected.sku ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      SKU: <Copyable text={selected.sku}>{selected.sku}</Copyable>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No SKU assigned</span>
                  )}
                  {selected.description && (
                    <span className="text-xs text-muted-foreground">· {selected.description}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</span>
                <span className="num text-2xl font-bold text-primary">{quantity(selected.quantity)}</span>
              </div>
            </div>
            {editable && (
              <div className="inline-actions my-3 gap-2">
                <button className="button-primary button-small" onClick={() => setModal('movement')}>Record stock movement</button>
                <button className="button-secondary button-small" onClick={() => setModal('edit')}>Edit item</button>
              </div>
            )}
            <div className="panel-heading history-heading mt-2">
              <div>
                <p className="section-label">Stock ledger</p>
                <h3>Movement history</h3>
              </div>
              <span className="status-tag status-muted">{historyTotal} recorded entries</span>
            </div>
            {history.length ? (
              <ol className="movement-list divide-y divide-border">
                {history.map((movement) => (
                  <li key={movement.id} className="py-3 hover:bg-surface-sunken/40 transition-colors px-1 rounded-sm">
                    <span
                      className={cn(
                        "movement-mark",
                        movement.quantityDelta >= 0 ? "text-success bg-success-soft" : "text-destructive bg-destructive-soft"
                      )}
                      aria-hidden="true"
                    >
                      {movement.quantityDelta >= 0 ? '+' : '−'}
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs font-semibold text-foreground">{label(movement.type)}</strong>
                      <span className="text-xs text-muted-foreground block">{movement.reason}</span>
                      <small className="text-[0.68rem] text-muted-foreground block">{new Date(movement.occurredAt).toLocaleString()}</small>
                    </div>
                    <div className="movement-quantities text-right">
                      <strong className={cn("font-mono text-sm font-bold", movement.quantityDelta >= 0 ? "text-success" : "text-destructive")}>
                        {movement.quantityDelta >= 0 ? '+' : ''}{quantity(movement.quantityDelta)}
                      </strong>
                      <small className="font-mono text-[0.7rem] text-muted-foreground block">Balance: {quantity(movement.resultingQuantity)}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No movements yet" description="Opening stock and later stock adjustments will appear here." />
            )}
            <div className="pagination-row pt-2">
              <span>Movement page {historyPage + 1}</span>
              <div className="inline-actions">
                <button className="button-secondary button-small" disabled={historyPage === 0} onClick={() => setHistoryPage((value) => Math.max(0, value - 1))}>Previous</button>
                <button className="button-secondary button-small" disabled={(historyPage + 1) * pageSize >= historyTotal} onClick={() => setHistoryPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="Select an inventory item" description="Choose an item from the list to inspect its stock level and ledger history." />
        )}
      </section>
    </div>
    {modal === 'create' && <ItemForm title="Add inventory item" item={null} busy={busy} onClose={() => setModal(null)} onSubmit={saveItem} />}
    {modal === 'edit' && selected && <ItemForm title="Edit inventory item" item={selected} busy={busy} onClose={() => setModal(null)} onSubmit={saveItem} />}
    {modal === 'movement' && selected && <MovementForm item={selected} busy={busy} onClose={() => setModal(null)} onSubmit={saveMovement} />}
  </div>
}

function ItemForm({ title, item, busy, onClose, onSubmit }: { title: string; item: InventoryItem | null; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title={title} description="Inventory uses the backend’s quantity ledger. No unit or reorder threshold is assumed." onClose={onClose}><form className="field-stack" onSubmit={(event) => onSubmit(event)}><label>Name<input name="name" defaultValue={item?.name ?? ''} maxLength={120} required /></label><label>SKU <span className="optional-label">Optional</span><input name="sku" defaultValue={item?.sku ?? ''} maxLength={80} /></label><label>Description <span className="optional-label">Optional</span><textarea name="description" defaultValue={item?.description ?? ''} maxLength={500} /></label>{!item && <label>Opening quantity <span className="optional-label">Optional</span><input name="openingQuantity" inputMode="decimal" pattern="\d{1,15}(\.\d{1,4})?" placeholder="0" /></label>}{item && <label className="checkbox-row"><input type="checkbox" name="active" defaultChecked={item.active} /> Item is active</label>}<div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save item'}</button></div></form></Modal>
}
function MovementForm({ item, busy, onClose, onSubmit }: { item: InventoryItem; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [type, setType] = useState<InventoryMovementType>('RECEIPT')
  const quantityLabel = type === 'COUNT_CORRECTION' ? 'Counted balance' : type === 'ADJUSTMENT' ? 'Signed quantity change' : 'Quantity'
  return <Modal title="Record stock movement" description={'Current backend balance: ' + quantity(item.quantity) + '. A movement is written to the stock ledger.'} onClose={onClose}><form className="field-stack" onSubmit={(event) => onSubmit(event)}><label>Movement type<select name="type" value={type} onChange={(event) => setType(event.target.value as InventoryMovementType)}>{movementTypes.map((value) => <option value={value} key={value}>{label(value)}</option>)}</select></label><label>{quantityLabel}<input name="quantity" inputMode="decimal" pattern={type === 'ADJUSTMENT' ? '-?\\d{1,15}(\\.\\d{1,4})?' : '\\d{1,15}(\\.\\d{1,4})?'} required /></label><p className="quiet-text">{movementHelp(type)}</p><label>Reason<input name="reason" maxLength={240} required /></label><div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Recording…' : 'Record movement'}</button></div></form></Modal>
}
function movementHelp(type: InventoryMovementType) { if (type === 'RECEIPT') return 'Enter the positive quantity received.'; if (type === 'DAMAGE') return 'Enter the positive quantity written off for damage.'; if (type === 'ADJUSTMENT') return 'Enter a signed delta. The backend prevents the balance from falling below zero.'; if (type === 'COUNT_CORRECTION') return 'Enter the new counted balance, not the difference.'; return 'Enter the opening stock quantity.' }
function label(value: string) { return value.toLowerCase().split('_').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') }
function quantity(value: number) { return value.toLocaleString(undefined, { maximumFractionDigits: 4 }) }
function messageOf(error: unknown) { return formatApiError(error) }
function safeSessionStorage() { try { return { getItem: (key: string) => sessionStorage.getItem(key), setItem: (key: string, value: string) => sessionStorage.setItem(key, value), removeItem: (key: string) => sessionStorage.removeItem(key) } } catch { return null } }
