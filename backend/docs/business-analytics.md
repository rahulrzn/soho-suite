# Business analytics MVP

The backend can calculate a small set of sales metrics from one explicitly mapped, confirmed dataset per business. It does not infer a column's meaning from its header or detected type. Each imported row must represent one order line, and the amount mapping must identify that line's amount rather than an order total repeated across lines.

This MVP reports the sum of the configured sales amounts. It does not claim accounting revenue, profit, expenses, inventory value, or other metrics that the imported dataset does not establish.

## Authentication and authorization

Both routes require the existing Firebase bearer-token authentication and verified-email policy. Every operation checks the caller's persisted membership in the requested business. Owners and managers can configure analytics; owners, managers, and viewers can read the overview. Dataset lookups are scoped to the requested business. A dataset belonging to another business is reported as not found.

## Configure the source dataset

`PUT /api/businesses/{businessId}/analytics/dataset-config`

Request:

```json
{
  "datasetId": 12,
  "dateColumn": "Order date",
  "lineAmountColumn": "Line amount",
  "orderIdColumn": "Order ID",
  "customerIdColumn": "Customer ID",
  "confirmedCurrency": "INR"
}
```

The dataset must be a confirmed (`IMPORTED`) dataset owned by the requested business. Column names must exactly match its reviewed column names, and every configured role must use a different column. `customerIdColumn` is optional. The request must explicitly confirm the business's current ISO 4217 currency. Values are not converted. If the business currency later changes, analytics become unavailable until the configuration is confirmed again.

The configuration replaces the business's previous selection and is persisted in `dataset_analytics_config` (Flyway V8). The database allows one selected dataset per business and one business configuration per dataset.

Successful response:

```json
{
  "datasetId": 12,
  "dateColumn": "Order date",
  "lineAmountColumn": "Line amount",
  "orderIdColumn": "Order ID",
  "customerIdColumn": "Customer ID",
  "confirmedCurrency": "INR",
  "updatedAt": "2026-11-03T12:00:00Z"
}
```

## Read the overview

`GET /api/businesses/{businessId}/analytics/overview?from=2026-05-01&to=2026-05-31`

`from` and `to` are required ISO `YYYY-MM-DD` business-calendar dates. Both ends are inclusive. Reversed ranges and ranges longer than 366 days are rejected. No timezone or timestamp conversion is performed.

Metrics:

- `totalSalesAmount`: sum of the mapped line amounts in the selected period.
- `distinctOrderCount`: case-sensitive distinct, trimmed order IDs.
- `averageOrderValue`: total sales amount divided by distinct order IDs; rounded to the currency's default fractional digits using half-up rounding.
- `distinctCustomerCount`: case-sensitive distinct, trimmed customer IDs, if configured.
- `dailySalesTrend`: one amount point for each date in the selected period. A zero means no mapped order-line amount was recorded on that date in this dataset; it does not prove the business had no real-world sales that day.
- `salesChangePercent`: `(selected period amount - preceding period amount) / preceding period amount * 100`, rounded to four decimal places. The preceding period has the same number of inclusive days and ends the day before `from`.

All monetary calculations use `BigDecimal`; input amounts must be plain decimal strings (up to 64 characters). Signs and a decimal point are accepted. Currency symbols, grouping separators, and exponent notation are not accepted. Negative amounts are retained as supplied by the source; the service does not classify refunds or otherwise reinterpret them.

Each metric has its own status, value, and reason. Status is `AVAILABLE`, `INCOMPLETE`, or `UNAVAILABLE`. A non-available metric has a null value and an explanation, never a misleading zero. For example:

```json
{
  "datasetId": 12,
  "datasetName": "May sales",
  "from": "2026-05-01",
  "to": "2026-05-02",
  "currency": "INR",
  "totalSalesAmount": { "status": "AVAILABLE", "value": 350.00, "reason": null },
  "distinctOrderCount": { "status": "AVAILABLE", "value": 2, "reason": null },
  "averageOrderValue": { "status": "AVAILABLE", "value": 175.00, "reason": null },
  "distinctCustomerCount": { "status": "UNAVAILABLE", "value": null, "reason": "No customer ID column is configured." },
  "dailySalesTrend": { "status": "AVAILABLE", "value": [{ "date": "2026-05-01", "salesAmount": 200.00 }, { "date": "2026-05-02", "salesAmount": 150.00 }], "reason": null },
  "salesChangePercent": { "status": "UNAVAILABLE", "value": null, "reason": "Both the selected and immediately preceding periods need order-line data." }
}
```

If analytics have not been configured, the endpoint returns all metrics as unavailable with a configuration reason.

## Incomplete and unavailable data

- A missing or invalid ISO date makes all period-based metrics incomplete because that row cannot be placed reliably in either period.
- A stored row that cannot be decoded is treated as having an unknown date and makes all period-based metrics incomplete.
- A missing or invalid amount makes sales amount, average order value, trend, and sales change incomplete for the affected period. Order and customer counts remain independently calculable when their identifiers are valid.
- A missing order ID makes order count and average order value incomplete. A missing customer ID makes only the configured customer count incomplete.
- A configured column that no longer exists, a non-imported dataset, a changed business currency, or mismatched row-count metadata makes the overview unavailable.
- No rows in the selected period is unavailable, not zero. Sales change is unavailable if either period has no rows or the preceding period total is zero.
- The endpoint supports at most 20,000 stored rows and reads them in pages of 100. It does not load an unbounded result set.

Validation failures use the existing `VALIDATION_ERROR` response. A non-member or viewer trying to configure receives the existing forbidden response. The API does not return raw dataset rows or customer identifiers.
