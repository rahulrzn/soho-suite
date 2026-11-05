/* eslint-disable react-hooks/set-state-in-effect -- The effect loads dataset metadata and paginated rows. */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { confirmDataset, deleteDataset, exportDatasetRows, getDataset, getDatasetRows, updateDataset } from '../api/datasetApi'
import { formatApiError } from '../api/formatError'
import type { DatasetDetail } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink, navigate } from '../app/navigation'
import { EmptyState, LoadingLine } from '../components/Feedback'
import { ConfirmDialog, Modal } from '../components/Modal'
import type { PageCallbacks } from './types'
import { canWriteDatasets } from '../workspace/membershipRole'
import { saveCsvDownload } from '../utils/download'
import { PageHeader } from '../soho/components/misc'

export function DatasetDetailPage({ datasetId, onError, onNotice }: PageCallbacks & { datasetId: number }) {
  const { business, role } = useWorkspace()
  const [detail, setDetail] = useState<DatasetDetail | null>(null)
  const [rows, setRows] = useState<string[][]>([])
  const [page, setPage] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'edit' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const canWrite = canWriteDatasets(role)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDataset(business.id, datasetId)
      setDetail(result)
      setRows(result.rows ?? [])
      setPage(result.page ?? 0)
      setTotalRows(result.totalRows ?? result.rowCount)
    } catch (error) { setDetail(null); onError(messageOf(error)) }
    finally { setLoading(false) }
  }, [business.id, datasetId, onError])
  useEffect(() => { void load() }, [load])

  async function changePage(nextPage: number) {
    if (!detail) return
    setLoading(true)
    try {
      const result = await getDatasetRows(business.id, datasetId, nextPage)
      setRows(result.rows)
      setPage(result.page)
      setTotalRows(result.totalRows)
    } catch (error) { onError(messageOf(error)) }
    finally { setLoading(false) }
  }
  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await updateDataset(business.id, datasetId, { name: String(form.get('name')).trim(), description: String(form.get('description')).trim() })
      setModal(null); onNotice('Dataset details saved.'); await load()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function removeDataset() {
    setBusy(true)
    try { await deleteDataset(business.id, datasetId); onNotice('Dataset deleted.'); navigate('/datasets') }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function confirmStaged() {
    if (!detail) return
    setBusy(true)
    try {
      const colNames = (detail.columns ?? []).map((c) => c.name)
      await confirmDataset(business.id, datasetId, colNames)
      onNotice('The backend confirmed this dataset import.')
      await load()
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  async function exportRows() {
    setDownloading(true)
    try {
      const result = await exportDatasetRows(business.id, datasetId)
      saveCsvDownload(result, 'dataset-' + datasetId + '-rows.csv')
      onNotice('CSV download started.')
    } catch (error) { onError(messageOf(error)) }
    finally { setDownloading(false) }
  }

  if (loading && !detail) return <section className="content-panel panel-pad"><LoadingLine text="Loading dataset details…" /></section>
  if (!detail) return <EmptyState title="Dataset unavailable" description="The dataset could not be loaded for this business." action={<RouteLink className="button-secondary" to="/datasets">Back to datasets</RouteLink>} />
  const columns = detail.columns ?? []
  const pageSize = detail.pageSize || 20
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  return <div className="feature-stack">
    <div className="detail-back-row flex items-center justify-between pb-1">
      <RouteLink className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors" to="/datasets">
        <span>←</span> Back to datasets
      </RouteLink>
      <span className={detail.status === 'IMPORTED' ? 'status-tag' : 'status-tag status-warning'}>
        {detail.status.toLowerCase()}
      </span>
    </div>
    <PageHeader
      eyebrow="Dataset inspection"
      title={detail.name}
      description={`${detail.originalFilename} · Uploaded ${new Date(detail.createdAt).toLocaleDateString()} · ${detail.rowCount.toLocaleString()} rows · ${detail.columnCount} columns`}
      actions={
        <div className="inline-actions">
          {canWrite && detail.status !== 'IMPORTED' && (
            <button
              className="button-primary button-small inline-flex items-center gap-1.5"
              type="button"
              disabled={busy}
              onClick={() => void confirmStaged()}
            >
              {busy ? 'Confirming…' : 'Confirm import'}
            </button>
          )}
          <button className="button-secondary button-small" type="button" disabled={downloading} onClick={() => void exportRows()}>
            {downloading ? 'Preparing CSV…' : 'Download rows CSV'}
          </button>
          {canWrite && (
            <>
              <button className="button-secondary button-small" onClick={() => setModal('edit')}>Edit details</button>
              <button className="button-danger button-small" onClick={() => setModal('delete')}>Delete dataset</button>
            </>
          )}
        </div>
      }
    />
    <section className="dataset-stat-grid">
      <article className="content-panel mini-stat">
        <span>Total Rows</span>
        <strong>{detail.rowCount.toLocaleString()}</strong>
      </article>
      <article className="content-panel mini-stat">
        <span>Columns</span>
        <strong>{detail.columnCount}</strong>
      </article>
      <article className="content-panel mini-stat">
        <span>File Type</span>
        <strong className="uppercase">{detail.fileType}</strong>
      </article>
      <article className="content-panel mini-stat">
        <span>Import Status</span>
        <strong className="text-sm font-semibold">{detail.importedAt ? new Date(detail.importedAt).toLocaleDateString() : 'Pending confirmation'}</strong>
      </article>
    </section>
    {Object.keys(detail.findings ?? {}).length > 0 && (
      <section className="content-panel panel-pad">
        <div className="panel-heading">
          <div>
            <p className="section-label">Data quality</p>
            <h2>Backend quality findings</h2>
          </div>
        </div>
        <div className="finding-grid">
          {Object.entries(detail.findings).map(([key, count]) => (
            <div key={key}>
              <span>{humanize(key)}</span>
              <strong>{count.toLocaleString()}</strong>
            </div>
          ))}
        </div>
        <p className="table-footnote">Quality findings describe the imported source file. Confirmation does not clean, correct, or alter source values.</p>
      </section>
    )}
    <section className="content-panel panel-pad dataset-detail-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Row inspection</p>
          <h2>Preview dataset rows</h2>
          <p>Page {page + 1} of {pageCount} · {pageSize} rows per page</p>
        </div>
        <span className="status-tag status-muted">{totalRows.toLocaleString()} stored rows</span>
      </div>
      {columns.length > 4 && rows.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">Scroll horizontally to view all {columns.length} columns.</p>
      )}
      {loading ? (
        <LoadingLine text="Loading dataset rows…" />
      ) : rows.length ? (
        <div className="table-wrap dataset-row-scroll" role="region" aria-label="Dataset rows" tabIndex={0}>
          <table className="data-table dataset-row-table">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">{column.name}</span>
                      <span className="text-[0.65rem] text-muted-foreground font-mono uppercase">{column.type}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={page + '-' + rowIndex} className="hover:bg-surface-sunken/50 transition-colors">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="text-xs">
                      {cell || <span className="missing-cell">Blank</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No rows found" description="The backend returned no row records for this page." />
      )}
      <div className="pagination-row pt-2">
        <span>Rows are read from the backend in pages of {pageSize}.</span>
        <div className="inline-actions">
          <button className="button-secondary button-small" disabled={loading || page <= 0} onClick={() => void changePage(page - 1)}>Previous</button>
          <button className="button-secondary button-small" disabled={loading || page + 1 >= pageCount} onClick={() => void changePage(page + 1)}>Next</button>
        </div>
      </div>
    </section>
    {modal === 'edit' && <Modal title="Edit dataset details" description="These labels describe the stored dataset. They do not change its rows." onClose={() => setModal(null)}><form className="field-stack" onSubmit={(event) => void saveMetadata(event)}><label>Name<input name="name" maxLength={160} defaultValue={detail.name} required /></label><label>Description<textarea name="description" maxLength={1000} defaultValue={detail.description ?? ''} /></label><div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button></div></form></Modal>}
    {modal === 'delete' && <ConfirmDialog title="Delete this dataset?" description="This removes the dataset, its parsed rows, and its analytics configuration from this business. This action cannot be undone." confirmLabel="Delete dataset" destructive busy={busy} onCancel={() => setModal(null)} onConfirm={() => void removeDataset()} />}
  </div>
}
function messageOf(error: unknown) { return formatApiError(error) }
function humanize(value: string) { return value.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase() }
