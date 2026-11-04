import type { DatasetMetadata } from '../api/models'

export function getDatasetSummary(datasets: DatasetMetadata[]) {
  return datasets.reduce((summary, dataset) => ({
    count: summary.count + 1,
    storedRows: summary.storedRows + dataset.rowCount,
    imported: summary.imported + Number(dataset.status === 'IMPORTED'),
    awaitingReview: summary.awaitingReview + Number(dataset.status !== 'IMPORTED'),
  }), { count: 0, storedRows: 0, imported: 0, awaitingReview: 0 })
}

export function searchDatasets(datasets: DatasetMetadata[], query: string) {
  const term = query.trim().toLocaleLowerCase()
  if (!term) return datasets
  return datasets.filter((dataset) => `${dataset.name} ${dataset.originalFilename} ${dataset.status}`.toLocaleLowerCase().includes(term))
}
