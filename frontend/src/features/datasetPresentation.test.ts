import { describe, expect, it } from 'vitest'
import type { DatasetMetadata } from '../api/models'
import { getDatasetSummary, searchDatasets } from './datasetPresentation'

const datasets: DatasetMetadata[] = [
  { id: 1, name: 'March sales', description: null, originalFilename: 'sales.csv', fileType: 'CSV', status: 'IMPORTED', rowCount: 120, columnCount: 4, createdAt: '2026-03-01' },
  { id: 2, name: 'Stock count', description: 'Warehouse', originalFilename: 'stock.xlsx', fileType: 'XLSX', status: 'UPLOADED', rowCount: 18, columnCount: 3, createdAt: '2026-03-02' },
]

describe('dataset presentation data', () => {
  it('derives summary counts from backend metadata without a fabricated quality score', () => {
    expect(getDatasetSummary(datasets)).toEqual({ count: 2, storedRows: 138, imported: 1, awaitingReview: 1 })
  })

  it('searches the loaded dataset list by its name or original filename', () => {
    expect(searchDatasets(datasets, 'stock')).toEqual([datasets[1]])
    expect(searchDatasets(datasets, 'CSV')).toEqual([datasets[0]])
    expect(searchDatasets(datasets, '  ')).toEqual(datasets)
  })
})
