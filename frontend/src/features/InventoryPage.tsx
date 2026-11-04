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
    <section className="operations-intro content-panel"><div><p className="section-label">STOCK ON HAND AND MOVEMENTS</p><h2>Keep inventory changes traceable.</h2><p>Quantities come from the backend stock ledger. The API does not define units, thresholds, or automatic sales deductions.</p></div><div className="inline-actions"><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('inventory')}>{downloadBusy ? 'Preparing CSV…' : 'Inventory CSV'}</button><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('movements')}>Movement CSV</button>{editable && <button className="button-primary" onClick={() => setModal('create')}>Add item <span aria-hidden="true">+</span></button>}</div></section>
    {!editable && <Message variant="warning" text="Your role can view inventory and movement history. An owner or manager can change stock." />}
    <div className="inventory-layout">
      <section className="content-panel panel-pad inventory-list-panel"><div className="panel-heading"><div><p className="section-label">ITEMS</p><h2>Inventory</h2><p>{total.toLocaleString()} items</p></div><label className="compact-filter">Show<select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as typeof activeFilter); setPage(0) }}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option></select></label></div>
        {loading ? <LoadingLine text="Loading inventory…" /> : items.length ? <div className="table-wrap"><table className="data-table inventory-table"><thead><tr><th>Item</th><th>On hand</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={selected?.id === item.id ? 'selected-row' : ''}><td><button className="inventory-item-link" onClick={() => { setSelected(item); setHistory([]); setHistoryTotal(0); setHistoryPage(0) }}><strong>{item.name}</strong><small>{item.sku || 'No SKU'}</small></button></td><td>{quantity(item.quantity)}</td><td><span className={item.active ? 'status-tag' : 'status-tag status-muted'}>{item.active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No inventory items" description="Add an item with its opening quantity to start a stock ledger." action={editable ? <button className="button-primary" onClick={() => setModal('create')}>Add inventory item</button> : undefined} />}
        <div className="pagination-row"><span>Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span><div className="inline-actions"><button className="button-secondary button-small" disabled={loading || page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><button className="button-secondary button-small" disabled={loading || (page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
      </section>
      <section className="content-panel panel-pad inventory-detail-panel">{selected ? <>
        <div className="panel-heading"><div><p className="section-label">ITEM DETAIL</p><h2>{selected.name}</h2><p>{selected.sku || 'No SKU'}{selected.description ? ' · ' + selected.description : ''}</p></div><span className="inventory-balance">{quantity(selected.quantity)}</span></div>
        <div className="inline-actions item-actions">{editable && <><button className="button-secondary button-small" onClick={() => setModal('edit')}>Edit item</button><button className="button-primary button-small" onClick={() => setModal('movement')}>Record movement</button></>}</div>
        <div className="panel-heading history-heading"><div><p className="section-label">STOCK LEDGER</p><h3>Movement history</h3></div><span className="status-tag status-muted">{historyTotal} entries</span></div>
        {history.length ? <ol className="movement-list">{history.map((movement) => <li key={movement.id}><span className="movement-mark" aria-hidden="true">{movement.quantityDelta >= 0 ? '+' : '−'}</span><div><strong>{label(movement.type)}</strong><span>{movement.reason}</span><small>{new Date(movement.occurredAt).toLocaleString()}</small></div><div className="movement-quantities"><strong>{movement.quantityDelta >= 0 ? '+' : ''}{quantity(movement.quantityDelta)}</strong><small>Balance {quantity(movement.resultingQuantity)}</small></div></li>)}</ol> : <EmptyState title="No movements yet" description="Opening stock and later changes appear here after the backend records them." />}
        <div className="pagination-row"><span>Movement page {historyPage + 1}</span><div className="inline-actions"><button className="button-secondary button-small" disabled={historyPage === 0} onClick={() => setHistoryPage((value) => Math.max(0, value - 1))}>Previous</button><button className="button-secondary button-small" disabled={(historyPage + 1) * pageSize >= historyTotal} onClick={() => setHistoryPage((value) => value + 1)}>Next</button></div></div>
      </> : <EmptyState title="Select an inventory item" description="Choose an item to inspect its current quantity and the history of stock movements." />}</section>
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
