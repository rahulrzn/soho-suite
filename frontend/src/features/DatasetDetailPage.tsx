/* eslint-disable react-hooks/set-state-in-effect -- The effect loads dataset metadata and paginated rows. */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { deleteDataset, exportDatasetRows, getDataset, getDatasetRows, updateDataset } from '../api/datasetApi'
import { formatApiError } from '../api/formatError'
import type { DatasetDetail } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink, navigate } from '../app/navigation'
import { EmptyState, LoadingLine } from '../components/Feedback'
import { ConfirmDialog, Modal } from '../components/Modal'
import type { PageCallbacks } from './types'
import { canWriteDatasets } from '../workspace/membershipRole'
import { saveCsvDownload } from '../utils/download'

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
    <div className="detail-back-row"><RouteLink className="button-quiet" to="/datasets">← All datasets</RouteLink><span className={detail.status === 'IMPORTED' ? 'status-tag' : 'status-tag status-warning'}>{detail.status.toLowerCase()}</span></div>
    <section className="content-panel panel-pad dataset-detail-head">
      <div><p className="section-label">DATASET DETAILS</p><h2>{detail.name}</h2><p>{detail.originalFilename} · Added {new Date(detail.createdAt).toLocaleDateString()}</p></div>
      <div className="inline-actions"><button className="button-secondary button-small" type="button" disabled={downloading} onClick={() => void exportRows()}>{downloading ? 'Preparing CSV…' : 'Download rows CSV'}</button>{canWrite && <><button className="button-secondary button-small" onClick={() => setModal('edit')}>Edit details</button><button className="button-danger button-small" onClick={() => setModal('delete')}>Delete dataset</button></>}</div>
    </section>
    <section className="dataset-stat-grid"><article className="content-panel mini-stat"><span>Rows</span><strong>{detail.rowCount.toLocaleString()}</strong></article><article className="content-panel mini-stat"><span>Columns</span><strong>{detail.columnCount}</strong></article><article className="content-panel mini-stat"><span>File type</span><strong>{detail.fileType}</strong></article><article className="content-panel mini-stat"><span>Imported</span><strong>{detail.importedAt ? new Date(detail.importedAt).toLocaleDateString() : 'Not confirmed'}</strong></article></section>
    {Object.keys(detail.findings ?? {}).length > 0 && <section className="content-panel panel-pad"><div className="panel-heading"><div><p className="section-label">DATA QUALITY</p><h2>Findings from the backend</h2></div></div><div className="finding-grid">{Object.entries(detail.findings).map(([key, count]) => <div key={key}><span>{humanize(key)}</span><strong>{count.toLocaleString()}</strong></div>)}</div><p className="table-footnote">Findings describe the imported source. Confirmation does not clean, correct, or certify the data.</p></section>}
    <section className="content-panel panel-pad"><div className="panel-heading"><div><p className="section-label">ROW INSPECTION</p><h2>Preview rows</h2><p>Page {page + 1} of {pageCount} · server page size {pageSize}</p></div><span className="status-tag status-muted">{totalRows.toLocaleString()} stored rows</span></div>
      {loading ? <LoadingLine text="Loading rows…" /> : rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr>{columns.map((column, index) => <th key={index}>{column.name}<small className="column-type">{column.type}</small></th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={page + '-' + rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || <span className="missing-cell">Blank</span>}</td>)}</tr>)}</tbody></table></div> : <EmptyState title="No rows in this page" description="The backend returned an empty page for this dataset." />}
      <div className="pagination-row"><span>Rows are read from the backend in pages of {pageSize}.</span><div className="inline-actions"><button className="button-secondary button-small" disabled={loading || page <= 0} onClick={() => void changePage(page - 1)}>Previous</button><button className="button-secondary button-small" disabled={loading || page + 1 >= pageCount} onClick={() => void changePage(page + 1)}>Next</button></div></div>
    </section>
    {modal === 'edit' && <Modal title="Edit dataset details" description="These labels describe the stored dataset. They do not change its rows." onClose={() => setModal(null)}><form className="field-stack" onSubmit={(event) => void saveMetadata(event)}><label>Name<input name="name" maxLength={160} defaultValue={detail.name} required /></label><label>Description<textarea name="description" maxLength={1000} defaultValue={detail.description ?? ''} /></label><div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button></div></form></Modal>}
    {modal === 'delete' && <ConfirmDialog title="Delete this dataset?" description="This removes the dataset, its parsed rows, and its analytics configuration from this business. This action cannot be undone." confirmLabel="Delete dataset" destructive busy={busy} onCancel={() => setModal(null)} onConfirm={() => void removeDataset()} />}
  </div>
}
function messageOf(error: unknown) { return formatApiError(error) }
function humanize(value: string) { return value.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replaceAll('-', ' ').toLowerCase() }
