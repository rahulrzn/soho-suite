/* eslint-disable react-hooks/set-state-in-effect -- The effect loads the business dataset list. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { ArrowRight, Check, FileSpreadsheet, Upload } from 'lucide-react'
import { ApiError } from '../api/apiTransport'
import { formatApiError } from '../api/formatError'
import { deleteDataset, getDataset, listDatasets, uploadDataset, confirmDataset } from '../api/datasetApi'
import type { DatasetDetail, DatasetMetadata } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { navigate } from '../app/navigation'
import { ConfirmDialog, Modal } from '../components/Modal'
import { LoadingLine, Message } from '../components/Feedback'
import { canWriteDatasets } from '../workspace/membershipRole'
import { clearPendingUploadKey, resolvePendingUploadKey, uploadPayloadFingerprint, type PendingUpload } from '../workspace/uploadIdempotency'
import type { PageCallbacks } from './types'
import { DatasetsScreen } from '../soho/screens/datasets-screen'
import type { Dataset as MockDataset } from '../soho/types'
import { cn } from '../lib/utils'

const maxBytes = 5 * 1024 * 1024
const uploadMemory = new Map<number, PendingUpload>()

export function DatasetsPage({ onError, onNotice }: PageCallbacks) {
  const { business, role } = useWorkspace()
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [preview, setPreview] = useState<DatasetDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DatasetMetadata | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
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
    setShowUpload(false)
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

  async function removeDataset() {
    if (!canWrite || !deleteTarget || deleteBusy) return
    setDeleteBusy(true)
    onError('')
    try {
      await deleteDataset(business.id, deleteTarget.id)
      setDeleteTarget(null)
      onNotice('Dataset deleted.')
      await load()
    } catch (error) { onError(messageOf(error)) }
    finally { setDeleteBusy(false) }
  }

  return <div className="feature-stack">
    {!canWrite && <Message variant="warning" text="Your membership is read-only for dataset changes. Ask a business owner or manager to upload or edit data." />}
    {loading ? (
      <section className="content-panel panel-pad"><LoadingLine text="Loading datasets…" /></section>
    ) : (
      <DatasetsScreen
        datasets={screenDatasets}
        profiles={{}}
        query={query}
        onQueryChange={setQuery}
        onUpload={canWrite ? () => { setPreview(null); setShowUpload(true) } : undefined}
        onOpenDataset={(id) => navigate('/datasets/' + id)}
        onConfirmDataset={canWrite ? async (id) => {
          try {
            const detail = await getDataset(business.id, Number(id))
            setPreview(detail)
          } catch (err) {
            onError(messageOf(err))
          }
        } : undefined}
        onDeleteDataset={canWrite ? (id) => {
          const target = datasets.find((dataset) => String(dataset.id) === id)
          if (target) setDeleteTarget(target)
        } : undefined}
      />
    )}
    {showUpload && <UploadDialog onClose={() => setShowUpload(false)} onUpload={upload} onError={onError} />}
    {preview && <ImportReview detail={preview} onClose={() => setPreview(null)} onConfirm={confirm} />}
    {deleteTarget && <ConfirmDialog title="Delete this dataset?" description="This permanently removes the dataset, its stored rows, and its analytics configuration from this business." confirmLabel="Delete dataset" destructive busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeDataset()} />}
  </div>
}

const typeBadgeTone: Record<string, string> = {
  text: "bg-surface-sunken text-muted-foreground border border-border/80",
  number: "bg-surface-sunken text-muted-foreground border border-border/80",
  date: "bg-surface-sunken text-muted-foreground border border-border/80",
  currency: "bg-surface-sunken text-muted-foreground border border-border/80",
  category: "bg-surface-sunken text-muted-foreground border border-border/80",
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

  function drop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files.item(0))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setLocalError(''); onError('')
    try {
      await onUpload(file, String(form.get('name') ?? ''), String(form.get('description') ?? ''))
      onClose()
    } catch (error) {
      const message = messageOf(error)
      setLocalError(error instanceof ApiError && error.status === 409 ? message + ' Retry safely with the same file and details; changing them creates a new request key.' : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal size="lg" title="Upload a dataset" description="Import spreadsheet files to unlock automated telemetry, health scoring, and business insights." onClose={onClose}>
      <form className="space-y-4 pt-1" onSubmit={(event) => void submit(event)}>
        <button
          type="button"
          className={cn(
            "w-full flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center group",
            dragging
              ? "border-primary bg-primary/5"
              : file
              ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
              : "border-border hover:border-border-strong hover:bg-surface-sunken/50 bg-surface-sunken/20"
          )}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          aria-label="Choose or drop a CSV or XLSX file"
        >
          <div className={cn(
            "size-12 rounded-xl flex items-center justify-center transition-colors",
            file ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-surface border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border-strong"
          )}>
            {file ? <FileSpreadsheet className="size-6" /> : <Upload className="size-6" />}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {file ? file.name : "Drop your dataset file here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              {file ? `${formatBytes(file.size)} · ready for upload` : "Supports .csv and .xlsx spreadsheets up to 5 MiB"}
            </p>
          </div>
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />

        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="px-2.5 py-1 rounded-full bg-surface-sunken border border-border">Max 20,000 rows</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-sunken border border-border">Max 100 columns</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-sunken border border-border">Header row required</span>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Dataset name <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              name="name"
              maxLength={160}
              defaultValue={file?.name.replace(/\.[^.]+$/, '') ?? ''}
              placeholder="e.g. Q4 Sales Orders or Shopify POS Export"
              className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-surface-sunken text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              name="description"
              maxLength={1000}
              rows={2}
              placeholder="Notes about source system, date ranges, or data scope..."
              className="w-full p-2.5 text-xs rounded-lg border border-border bg-surface-sunken text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
            />
          </div>
        </div>

        {localError && <Message variant="error" text={localError} />}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-3">
          <button
            className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-surface-sunken transition-colors"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            disabled={!file || busy}
          >
            {busy ? (
              <>
                <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Uploading & parsing…</span>
              </>
            ) : (
              <>
                <span>Upload and review</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ImportReview({ detail, onClose, onConfirm }: { detail: DatasetDetail; onClose: () => void; onConfirm: (dataset: DatasetDetail, names: string[]) => Promise<void> }) {
  const [names, setNames] = useState(() => (detail.columns ?? []).map((column) => column.name))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    const cleaned = names.map((name) => name.trim())
    if (cleaned.some((name) => !name)) {
      setError('Every column needs a name before you continue.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onConfirm(detail, cleaned)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setBusy(false)
    }
  }

  const findingsEntries = Object.entries(detail.findings ?? {})

  return (
    <Modal
      size="xl"
      title="Review dataset schema"
      description="Verify detected column types and confirm destination column names before importing."
      onClose={onClose}
    >
      <div className="space-y-4 pt-1">
        {/* File Overview Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-surface-sunken/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-surface border border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
              <FileSpreadsheet className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm tracking-tight truncate">{detail.name}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-sunken text-muted-foreground border border-border/80">
                  <Check className="size-3" /> Ready for review
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="text-foreground/90 font-mono font-medium">{detail.originalFilename}</span> · <span className="font-mono text-foreground/90">{detail.rowCount.toLocaleString()}</span> rows · <span className="font-mono text-foreground/90">{detail.columnCount}</span> columns
              </p>
            </div>
          </div>

          {findingsEntries.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {findingsEntries.map(([key, count]) => (
                <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border/80 text-xs">
                  <span className="text-muted-foreground capitalize">{humanize(key)}:</span>
                  <span className={cn("font-mono font-semibold", count > 0 ? "text-amber-400" : "text-foreground")}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column Schema Mapping */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Column Schema Mapping</h4>
              <p className="text-[11px] text-muted-foreground">Review or edit destination column names detected by the parser.</p>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-surface-sunken px-2.5 py-0.5 rounded-md border border-border/80">
              {names.length} columns detected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
            {detail.columns?.map((column, index) => {
              const typeKey = (column.type ?? '').toLowerCase()
              const badgeStyle = typeBadgeTone[typeKey] ?? "bg-surface-sunken text-muted-foreground border border-border/80"
              return (
                <div key={index} className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border/80 bg-surface/80 hover:border-border-strong hover:bg-surface transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate" title={column.originalName}>
                      {column.originalName || '(blank header)'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide", badgeStyle)}>
                        {column.type}
                      </span>
                      {column.missingValues > 0 ? (
                        <span className="text-[10px] font-medium text-amber-400 font-mono bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
                          {column.missingValues} missing
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">0 missing</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <input
                      className="w-full h-8 px-2.5 text-xs rounded-md border border-border bg-surface-sunken text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                      value={names[index] ?? ''}
                      maxLength={255}
                      required
                      placeholder="Destination name"
                      aria-label={'Reviewed name for ' + (column.originalName || 'column ' + (index + 1))}
                      onChange={(event) => setNames((previous) => previous.map((name, nameIndex) => nameIndex === index ? event.target.value : name))}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Backend Parsed Sample Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample Data Preview (First 5 Rows)</h4>
            <span className="text-[11px] text-muted-foreground">Showing parsed column values</span>
          </div>
          <div className="rounded-xl border border-border/80 bg-surface overflow-hidden">
            <div className="overflow-x-auto max-h-[140px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-sunken/80 sticky top-0 z-10">
                    {names.map((name, index) => (
                      <th key={index} className="py-2 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap font-mono">
                        {name || 'Column ' + (index + 1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(detail.rows ?? []).slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-surface-sunken/60 transition-colors odd:bg-surface even:bg-surface-sunken/20">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="py-2 px-3 text-foreground whitespace-nowrap font-mono text-xs">
                          {cell || <span className="inline-block px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-[10px] text-muted-foreground italic">Blank</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {error && <Message variant="error" text={error} />}

        {/* Sticky Modal Actions */}
        <div className="sticky -bottom-6 -mx-6 bg-surface/95 backdrop-blur-md p-4 px-6 border-t border-border mt-3 flex items-center justify-between gap-3 rounded-b-xl z-20">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Ready to import <span className="font-semibold text-foreground font-mono">{detail.rowCount.toLocaleString()}</span> rows across <span className="font-semibold text-foreground font-mono">{names.length}</span> columns
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-surface-sunken transition-colors"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? (
                <>
                  <span className="size-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Confirming import…</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Confirm import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function safeSessionStorage() { try { return { getItem: (key: string) => sessionStorage.getItem(key), setItem: (key: string, value: string) => sessionStorage.setItem(key, value), removeItem: (key: string) => sessionStorage.removeItem(key) } } catch { return null } }
function messageOf(error: unknown) { return formatApiError(error) }
function formatBytes(bytes: number) { return (bytes / 1024 / 1024).toFixed(2) + ' MiB' }
function humanize(value: string) { return value.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase() }
