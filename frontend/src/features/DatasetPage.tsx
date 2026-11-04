/* eslint-disable react-hooks/set-state-in-effect -- The effect loads the business dataset list. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { ApiError } from '../api/apiTransport'
import { formatApiError } from '../api/formatError'
import { getDataset, listDatasets, uploadDataset, confirmDataset } from '../api/datasetApi'
import type { DatasetDetail, DatasetMetadata } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { navigate } from '../app/navigation'
import { Modal } from '../components/Modal'
import { LoadingLine, Message } from '../components/Feedback'
import { canWriteDatasets } from '../workspace/membershipRole'
import { clearPendingUploadKey, resolvePendingUploadKey, uploadPayloadFingerprint, type PendingUpload } from '../workspace/uploadIdempotency'
import type { PageCallbacks } from './types'
import { DatasetsScreen } from '../soho/screens/datasets-screen'
import type { Dataset as MockDataset } from '../soho/types'

const maxBytes = 5 * 1024 * 1024
const uploadMemory = new Map<number, PendingUpload>()

export function DatasetsPage({ onError, onNotice }: PageCallbacks) {
  const { business, role } = useWorkspace()
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [preview, setPreview] = useState<DatasetDetail | null>(null)
  const canWrite = canWriteDatasets(role)
  const screenDatasets: MockDataset[] = datasets.map((dataset) => ({
    id: String(dataset.id),
    name: dataset.name,
    description: dataset.description ?? undefined,
    source: dataset.fileType.toLowerCase().includes('csv') ? 'CSV' : dataset.fileType.toLowerCase().includes('xlsx') ? 'Excel' : dataset.fileType,
    rows: dataset.rowCount,
    columns: dataset.columnCount,
    updatedAt: new Date(dataset.createdAt).toLocaleDateString(),
    status: dataset.status === 'IMPORTED' ? 'ready' : 'needs-review',
  }))
  const load = useCallback(async () => {
    setLoading(true)
    try { setDatasets(await listDatasets(business.id)) }
    catch (error) { onError(messageOf(error)) }
    finally { setLoading(false) }
  }, [business.id, onError])
  useEffect(() => { void load() }, [load])

  async function upload(file: File, name: string, description: string) {
    if (!canWrite) throw new Error('Your business role can view datasets but cannot upload them.')
    const fingerprint = uploadPayloadFingerprint({ filename: file.name, size: file.size, lastModified: file.lastModified, name, description })
    const storage = safeSessionStorage()
    const key = resolvePendingUploadKey({ businessId: business.id, fingerprint, memory: uploadMemory, storage })
    const uploaded = await uploadDataset(business.id, file, name, description, key)
    clearPendingUploadKey(business.id, uploadMemory, storage)
    const detail = uploaded.columns ? uploaded : await getDataset(business.id, uploaded.id)
    setPreview(detail)
    await load()
    onNotice('Dataset uploaded. Review the column names and quality findings before confirming import.')
  }

  async function confirm(detail: DatasetDetail, names: string[]) {
    const result = await confirmDataset(business.id, detail.id, names)
    const refreshed = result.columns ? result : await getDataset(business.id, detail.id)
    setPreview(null)
    await load()
    onNotice('The backend confirmed this dataset import.')
    navigate('/datasets/' + refreshed.id)
  }

  return <div className="feature-stack">
    {!canWrite && <Message variant="warning" text="Your membership is read-only for dataset changes. Ask a business owner or manager to upload or edit data." />}
    {loading ? <section className="content-panel panel-pad"><LoadingLine text="Loading datasets…" /></section> : <DatasetsScreen datasets={screenDatasets} profiles={{}} query={query} onQueryChange={setQuery} onUpload={canWrite ? () => { setPreview(null); setShowUpload(true) } : undefined} onOpenDataset={(id) => navigate('/datasets/' + id)} />}
    {showUpload && <UploadDialog onClose={() => setShowUpload(false)} onUpload={upload} onError={onError} />}
    {preview && <ImportReview detail={preview} onClose={() => setPreview(null)} onConfirm={confirm} />}
  </div>
}

function UploadDialog({ onClose, onUpload, onError }: { onClose: () => void; onUpload: (file: File, name: string, description: string) => Promise<void>; onError: (value: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  function choose(next: File | null) {
    setLocalError('')
    if (!next) { setFile(null); return }
    if (!/\.(csv|xlsx)$/i.test(next.name)) { setFile(null); setLocalError('Choose a .csv or .xlsx file.'); return }
    if (next.size > maxBytes) { setFile(null); setLocalError('This file is larger than the 5 MiB upload limit.'); return }
    setFile(next)
  }
  function drop(event: DragEvent<HTMLButtonElement>) { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files.item(0)) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setLocalError(''); onError('')
    try { await onUpload(file, String(form.get('name') ?? ''), String(form.get('description') ?? '')); onClose() }
    catch (error) { const message = messageOf(error); setLocalError(error instanceof ApiError && error.status === 409 ? message + ' Retry safely with the same file and details; changing them creates a new request key.' : message) }
    finally { setBusy(false) }
  }
  return <Modal title="Upload a dataset" description="The backend checks file limits and returns a review preview before import confirmation." onClose={onClose}>
    <form className="field-stack" onSubmit={(event) => void submit(event)}>
      <button type="button" className={'drop-zone' + (dragging ? ' is-dragging' : '')} onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop} aria-label="Choose or drop a CSV or XLSX file">
        <span className="drop-icon" aria-hidden="true">↑</span><strong>{file ? file.name : 'Choose a CSV or Excel file'}</strong><small>{file ? formatBytes(file.size) + ' · selected for review' : 'Drop a file here or browse · maximum size 5 MiB'}</small>
      </button>
      <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => choose(event.target.files?.[0] ?? null)} />
      <div className="upload-limit-note"><span>20,000 data rows</span><span>100 columns</span><span>Header plus at least one data row</span></div>
      <label>Dataset name <span className="optional-label">Optional</span><input name="name" maxLength={160} defaultValue={file?.name.replace(/\.[^.]+$/, '') ?? ''} /></label>
      <label>Description <span className="optional-label">Optional</span><textarea name="description" maxLength={1000} /></label>
      {localError && <Message variant="error" text={localError} />}
      <div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button-primary" disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload and review'}</button></div>
    </form>
  </Modal>
}

function ImportReview({ detail, onClose, onConfirm }: { detail: DatasetDetail; onClose: () => void; onConfirm: (dataset: DatasetDetail, names: string[]) => Promise<void> }) {
  const [names, setNames] = useState(() => (detail.columns ?? []).map((column) => column.name))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  async function confirm() {
    const cleaned = names.map((name) => name.trim())
    if (cleaned.some((name) => !name)) { setError('Every column needs a name before you continue.'); return }
    setBusy(true); setError('')
    try { await onConfirm(detail, cleaned) } catch (reason) { setError(messageOf(reason)) } finally { setBusy(false) }
  }
  return <Modal title={confirming ? 'Confirm this import?' : 'Review your dataset'} description={confirming ? 'The backend will mark the reviewed dataset as imported with these column names.' : 'Review the column names and quality findings before confirming.'} onClose={onClose}>
    {!confirming ? <div className="field-stack">
      <div className="import-file-note"><strong>{detail.name}</strong><span>{detail.originalFilename} · {detail.rowCount.toLocaleString()} rows · {detail.columnCount} columns</span></div>
      {Object.keys(detail.findings ?? {}).length > 0 && <div className="review-findings"><strong>Backend quality findings</strong><div className="finding-grid">{Object.entries(detail.findings).map(([key, count]) => <div key={key}><span>{humanize(key)}</span><strong>{count.toLocaleString()}</strong></div>)}</div><p>These findings are informational. Confirming does not change or clean the source values.</p></div>}
      <div className="column-review-list"><strong>Column names</strong>{detail.columns?.map((column, index) => <label key={index}><span>{column.originalName || '(blank header)'}<small>{column.type} · {column.missingValues.toLocaleString()} missing</small></span><input value={names[index] ?? ''} maxLength={255} required aria-label={'Reviewed name for ' + (column.originalName || 'column ' + (index + 1))} onChange={(event) => setNames((previous) => previous.map((name, nameIndex) => nameIndex === index ? event.target.value : name))} /></label>)}</div>
      <div className="review-preview"><strong>First rows returned by the backend</strong><div className="table-wrap"><table className="data-table"><thead><tr>{names.map((name, index) => <th key={index}>{name || 'Column ' + (index + 1)}</th>)}</tr></thead><tbody>{(detail.rows ?? []).slice(0, 5).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}>{cell || <span className="missing-cell">Blank</span>}</td>)}</tr>)}</tbody></table></div></div>
      {error && <Message variant="error" text={error} />}
      <div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button-primary" type="button" onClick={() => setConfirming(true)}>Review and continue</button></div>
    </div> : <div className="field-stack"><p className="quiet-text">This confirms the import on the backend. Your data remains as uploaded; quality findings are retained for reference.</p>{error && <Message variant="error" text={error} />}<div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setConfirming(false)}>Back to review</button><button className="button-primary" type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Confirming…' : 'Confirm import'}</button></div></div>}
  </Modal>
}

function safeSessionStorage() { try { return { getItem: (key: string) => sessionStorage.getItem(key), setItem: (key: string, value: string) => sessionStorage.setItem(key, value), removeItem: (key: string) => sessionStorage.removeItem(key) } } catch { return null } }
function messageOf(error: unknown) { return formatApiError(error) }
function formatBytes(bytes: number) { return (bytes / 1024 / 1024).toFixed(2) + ' MiB' }
function humanize(value: string) { return value.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase() }
