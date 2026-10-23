# Small Business Analytics Platform — Complete Requirements Specification

## Contents

- [Purpose](#1-purpose)
- [Target users](#2-target-users)
- [Small-business problems](#3-small-business-problems-the-platform-must-address)
- [Functional requirements](#4-functional-requirements)
- [Analytics requirements](#5-analytics-requirements)
- [Dashboard requirements](#6-dashboard-requirements)
- [Filtering and drill-down](#7-filtering-and-drill-down)
- [Refresh and data freshness](#8-refresh-and-data-freshness)
- [Reporting and export](#9-reporting-and-export)
- [Alerts and monitoring](#10-alerts-and-monitoring)
- [Data quality](#11-data-quality-requirements)
- [Data lineage and traceability](#12-data-lineage-and-traceability)
- [Natural-language analytics](#13-natural-language-analytics--phase-2)
- [Forecasting and advanced analytics](#14-forecasting-and-advanced-analytics--phase-2)
- [Non-functional requirements](#15-non-functional-requirements)
- [SME product principles](#16-sme-specific-product-principles)
- [MVP prioritization](#17-mvp-prioritization)
- [Low-priority features](#18-features-that-are-low-priority-for-the-initial-sme-mvp)
- [Product architecture concept](#19-product-architecture-concept)
- [Fundamental product requirements](#20-fundamental-product-requirements)
- [Core product proposition](#21-core-product-proposition)
- [Requirement-to-development flow](#22-requirement-to-development-flow)
- [Requirement record format](#23-recommended-requirement-record-format)

## 1. Purpose

The purpose of this platform is to provide small businesses with a **self-service analytics system** that consolidates scattered operational data, improves data quality and trust, calculates important business metrics, and presents understandable dashboards, alerts, and reports without requiring users to understand SQL, databases, data engineering, or traditional BI tools.

The platform should solve the common small-business problem in which business information exists across multiple disconnected sources such as:

- CSV files
- Excel workbooks
- Google Sheets
- Accounting systems
- POS / billing systems
- CRM platforms
- E-commerce systems
- Websites
- Advertising platforms
- Inventory systems
- Databases
- Bank and expense records

The goal is not merely to create charts. The full information flow should be:

```text
DATA
  ↓
COLLECT
  ↓
VALIDATE
  ↓
CLEAN
  ↓
CONNECT
  ↓
MODEL
  ↓
CALCULATE
  ↓
UNDERSTAND
  ↓
DETECT PROBLEMS
  ↓
ALERT
  ↓
ACT
```

---

## 2. Target Users

### 2.1 Business Owner / Admin

Typical needs:

- View overall business health
- Track sales and profitability
- Monitor cash flow
- Manage users
- Configure data sources
- Receive alerts
- Understand business trends

### 2.2 Manager

Typical needs:

- Monitor team or store performance
- Analyze products and customers
- Compare periods
- Drill down into problems
- Access operational reports

### 2.3 Accountant / Finance User

Typical needs:

- Revenue and expense visibility
- Receivables and payables
- Cash-flow monitoring
- Profitability analysis
- Financial exports

### 2.4 Sales User

Typical needs:

- Sales trends
- Customer activity
- Product performance
- Channel performance
- Personal or team performance where applicable

### 2.5 Viewer / Employee

Typical needs:

- View permitted dashboards
- Use filters
- Download approved reports
- No administrative control

---

## 3. Small-Business Problems the Platform Must Address

The platform should explicitly address the following SME realities:

1. Data is often scattered across spreadsheets and multiple SaaS tools.
2. Small businesses often do not employ dedicated data engineers or BI analysts.
3. Manual reconciliation consumes time.
4. Metric definitions may differ between spreadsheets, teams, or systems.
5. Poor or stale data causes users to lose trust in dashboards.
6. Enterprise BI tools may be too expensive or complex.
7. Small-business users generally need a limited set of actionable KPIs rather than large numbers of charts.
8. Users need understandable business language rather than technical database terminology.
9. Excel and spreadsheets remain important and should be supported, not treated as something users must immediately abandon.
10. Users need to move from “what happened?” to “why?” and then to “what needs attention?”

---

## 4. Functional Requirements

### FR-01 — User and Business Workspace Management

#### Description

The platform must represent both **users** and **business organizations/workspaces**.

Example:

```text
User
  ↓
Business Workspace
  ├── Owner / Admin
  ├── Manager
  └── Viewer
```

#### Requirements

The system shall allow users to:

- Register an account.
- Log in.
- Log out.
- Reset forgotten passwords.
- Update account details.
- Create a business workspace.
- Update business details.
- Invite users to a workspace.
- Remove users from a workspace.
- Assign user roles.
- View workspace members.
- Disable access for selected users.
- Support one or more businesses per user if required by future product scope.

#### Initial Role Model

For MVP, the platform should prefer a simple role model:

- Owner / Admin
- Manager
- Viewer

Complex enterprise-level permission structures should be avoided unless required.

---

### FR-02 — Authentication and Authorization

The platform shall:

- Authenticate users before protected resources are accessed.
- Authorize every business-scoped action.
- Prevent unauthorized access to dashboards, datasets, reports, and configuration.
- Restrict administrative features to authorized roles.
- Support secure session management.
- Support role-based access control.

---

### FR-03 — Data Ingestion

#### Initial Sources

The MVP should support:

- CSV
- Excel
- Google Sheets
- Relational databases

Later phases may add:

- Accounting platforms
- POS systems
- CRM systems
- E-commerce platforms
- Payment platforms
- Advertising platforms
- ERP systems
- External APIs

#### Requirements

The system shall allow users to:

- Upload a CSV file.
- Upload an Excel workbook.
- Preview imported data.
- Select a worksheet from an Excel workbook.
- Connect an approved external data source.
- Select tables or datasets to import.
- Map source columns where necessary.
- Update an existing dataset.
- Delete a dataset.
- View import history.
- View import status.
- Retry failed imports.
- See source information for each dataset.

---

### FR-04 — Automatic Schema Detection

The platform should minimize technical setup.

For example:

```text
order_id   → identifier
date       → date
customer   → category/entity
quantity   → numeric
price      → currency
```

#### Requirements

The system shall attempt to detect:

- Column names
- Data types
- Dates
- Integers
- Decimal values
- Currency fields
- Identifiers
- Categories
- Boolean fields
- Missing values
- Duplicate values
- Potential primary keys

The system should provide suggestions rather than requiring the user to manually define every field.

---

### FR-05 — Data Validation

The system shall validate imported data for:

- Missing values
- Duplicate records
- Invalid dates
- Invalid numeric values
- Incorrect data types
- Unexpected negative values where relevant
- Broken identifiers
- Empty required fields
- Inconsistent categories
- Referential integrity problems where relationships exist

The system shall provide understandable validation messages.

---

### FR-06 — Data Cleaning

The system should support:

- Removing duplicates
- Filling or excluding missing values
- Standardizing dates
- Converting data types
- Normalizing text values
- Standardizing categories
- Cleaning leading/trailing spaces
- Handling malformed records
- Correcting approved data-quality issues

Example:

```text
Chennai
chennai
CHENNAI
ChennaI
```

may be standardized to:

```text
Chennai
```

The original source data should be preserved separately from cleaned data where appropriate.

---

### FR-07 — Raw Data Preservation

The platform should preserve a reliable original/raw representation of imported data.

This enables:

- Auditing
- Reprocessing
- Debugging
- Comparing transformed values to original values
- Recovery from incorrect transformations

---

### FR-08 — Data Relationship Management

Businesses may upload data in multiple related datasets.

Example:

```text
Customers
   │
   └── Orders
        ├── Products
        └── Payments
```

#### Requirements

The platform shall support:

- Dataset joins
- Primary keys
- Foreign keys
- One-to-many relationships
- Many-to-one relationships
- Relationship validation
- Broken-reference detection

The platform should attempt to suggest likely relationships where possible.

---

### FR-09 — Data Transformation

The platform should support common transformations such as:

- Renaming columns
- Selecting columns
- Converting data types
- Creating calculated columns
- Joining datasets
- Aggregating values
- Grouping values
- Mapping categories
- Standardizing dimensions

Transformations should be traceable where practical.

---

## 5. Analytics Requirements

### FR-10 — KPI Engine

The platform shall provide a reusable KPI calculation engine.

Metric formulas should be centrally defined rather than recreated independently for every dashboard.

---

### FR-11 — Sales Analytics

The platform should support:

- Total Revenue
- Total Orders
- Units Sold
- Average Order Value
- Average Selling Price
- Sales Growth
- Month-over-Month Growth
- Quarter-over-Quarter Growth
- Year-over-Year Growth
- Revenue by Product
- Revenue by Category
- Revenue by Customer
- Revenue by Location
- Revenue by Store
- Revenue by Channel
- Revenue by Employee, where appropriate

Example:

```text
Average Order Value =
Total Revenue / Number of Orders
```

---

### FR-12 — Profitability Analytics

The platform should support:

- Revenue
- Cost
- Gross Profit
- Gross Margin
- Expenses
- Net Profit
- Net Margin
- Profit by Product
- Profit by Category
- Profit by Customer
- Profit by Store
- Profit by Channel

---

### FR-13 — Customer Analytics

The platform should support:

- Total Customers
- New Customers
- Returning Customers
- Repeat Purchase Rate
- Customer Retention
- Customer Churn
- Revenue per Customer
- Customer Lifetime Value
- Purchase Frequency
- Customer Growth
- High-value customers
- Inactive customers
- Customers whose spending is increasing
- Customers whose spending is declining

---

### FR-14 — Product Analytics

The platform should support:

- Top-selling products
- Lowest-selling products
- Revenue by product
- Profit by product
- Units sold
- Average selling price
- Product growth
- Product decline
- Category-level performance
- Product contribution to total revenue
- Product contribution to profit

---

### FR-15 — Inventory Analytics

Where inventory data exists, the platform should support:

- Current inventory
- Low-stock items
- Out-of-stock products
- Inventory value
- Inventory turnover
- Slow-moving inventory
- Fast-moving inventory
- Stock trends
- Reorder warnings

---

### FR-16 — Marketing Analytics

Where marketing data exists, the platform should support:

- Leads
- Conversions
- Conversion Rate
- Customer Acquisition Cost
- Cost per Lead
- Return on Ad Spend
- Revenue by Channel
- Campaign performance
- Lead-source performance
- Marketing spend

---

### FR-17 — Financial and Cash-Flow Analytics

For small businesses, financial visibility should be a major product requirement.

The platform should support:

- Revenue
- Expenses
- Cash inflows
- Cash outflows
- Accounts receivable
- Accounts payable
- Outstanding invoices
- Cash balance
- Cash-flow trend
- Customer profitability
- Product profitability
- Short-term financial visibility

---

## 6. Dashboard Requirements

### FR-18 — Business Overview Dashboard

A default business dashboard should show a focused collection of high-value metrics.

Example:

```text
-----------------------------------------------------
             BUSINESS OVERVIEW

Revenue       Profit       Orders       Customers
₹8.5L         ₹1.9L        643          392

Revenue vs last month
↑ 12.4%

-----------------------------------------------------

Revenue Trend

-----------------------------------------------------

Top Products            Sales by Region

-----------------------------------------------------

Things requiring attention

⚠ Product X stock low
⚠ Revenue down 14% in Chennai
⚠ Expenses up 22%
-----------------------------------------------------
```

The system should avoid overwhelming users with unnecessary KPIs.

---

### FR-19 — KPI Cards

The dashboard shall support KPI cards for metrics such as:

- Revenue
- Profit
- Orders
- Customers
- Average Order Value
- Growth
- Expense
- Inventory value

---

### FR-20 — Charts

The dashboard should support appropriate visualizations such as:

- Line charts
- Bar charts
- Area charts
- Tables
- KPI cards
- Comparison charts
- Trend views

Visualization choice should prioritize comprehension over decoration.

---

### FR-21 — Dashboard Customization

Users should be able to:

- Rearrange supported widgets.
- Show or hide selected metrics.
- Save dashboard views.
- Choose date ranges.
- Apply filters.

Advanced drag-and-drop BI authoring is not required for the initial MVP.

---

## 7. Filtering and Drill-down

### FR-22 — Filtering

The platform should support filtering by available business dimensions such as:

- Date
- Product
- Category
- Customer
- Location
- Region
- Store
- Employee
- Salesperson
- Channel

Filters should update relevant dashboard metrics and charts.

---

### FR-23 — Drill-down

Users should be able to navigate from summary metrics into causes.

Example:

```text
Revenue ↓ 18%
   ↓
Region
   ↓
Chennai
   ↓
Category
   ↓
Electronics
   ↓
Product
```

The platform should help users move from:

```text
What happened?
→ Where did it happen?
→ Why might it have happened?
```

---

## 8. Refresh and Data Freshness

### FR-24 — Manual Refresh

Users shall be able to manually refresh supported data sources.

---

### FR-25 — Scheduled Refresh

The system should support scheduled refresh.

For MVP, daily refresh is sufficient for many small-business use cases.

Future versions may support:

- Hourly refresh
- Source-dependent refresh frequency
- Near-real-time updates

---

### FR-26 — Refresh History

The system shall show:

- Refresh date/time
- Refresh status
- Dataset
- Duration
- Number of affected records where available
- Failure reason

---

### FR-27 — Freshness Information

Dashboards should display:

- Last updated timestamp
- Data source
- Record count where useful
- Current refresh status

Example:

```text
Last updated:
29 Sep 2026, 10:32 AM

Source:
Sales Database

Records:
284,392
```

---

## 9. Reporting and Export

### FR-28 — CSV Export

Users should be able to export permitted data and reports to CSV.

---

### FR-29 — Excel Export

Users should be able to export permitted data to Excel because spreadsheet workflows remain important to small businesses.

---

### FR-30 — PDF Reports

The platform should support downloadable PDF reports.

---

### FR-31 — Chart Export

Users should be able to download chart images where useful.

---

### FR-32 — Scheduled Reports

Later phases should support:

- Daily reports
- Weekly reports
- Monthly reports
- Email delivery
- Report recipients
- Report templates

---

## 10. Alerts and Monitoring

### FR-33 — Threshold Alerts

Users should be able to configure simple business rules.

Example:

```text
WHEN inventory < 10
SEND notification
```

or:

```text
WHEN sales decrease > 20%
SEND notification
```

---

### FR-34 — Business Alerts

Potential alerts include:

- Low inventory
- Out-of-stock items
- Sales decline
- Revenue growth
- Expense increase
- Revenue target achieved
- Customer inactivity
- Invoice overdue
- Data refresh failure

---

### FR-35 — Notifications

The platform should support in-app notifications.

Later phases may support:

- Email notifications
- SMS
- Messaging integrations

---

## 11. Data Quality Requirements

### FR-36 — Data Quality Dashboard

The system should provide a simple data-health view.

Example:

```text
DATA HEALTH

Completeness       96%
Duplicates         123
Missing values     412
Invalid records    26

⚠ Customer phone has 18% missing values
⚠ Product IDs contain 12 duplicates
```

---

### FR-37 — Data Quality Metrics

The platform should track:

- Completeness
- Duplicate count
- Invalid records
- Missing values
- Relationship failures
- Data-type errors

---

## 12. Data Lineage and Traceability

### FR-38 — Source Traceability

Users should be able to identify:

- Which source produced a dataset
- When the source was imported
- When it was last refreshed
- Which dataset feeds a dashboard

---

### FR-39 — Transformation Traceability

Where practical, the platform should record key transformations applied between raw data and analytical output.

---

## 13. Natural-Language Analytics — Phase 2

### FR-40 — Business Questions in Natural Language

Users may ask:

- How much did we sell last month?
- What is our best product?
- Why did revenue decrease?
- Which customers have not purchased for 90 days?
- Which store grew the most?

The system should interpret the request using an approved semantic/metric model rather than allowing uncontrolled generation of arbitrary results.

---

## 14. Forecasting and Advanced Analytics — Phase 2

### FR-41 — Sales Forecasting

Forecast future sales from historical information where data quality is sufficient.

---

### FR-42 — Demand Forecasting

Estimate future product demand.

---

### FR-43 — Inventory Forecasting

Estimate potential stock requirements.

---

### FR-44 — Cash-Flow Forecasting

Estimate future cash inflows/outflows where sufficient financial data exists.

---

### FR-45 — Customer Churn Prediction

Identify customers whose recent behavior indicates elevated churn risk.

---

### FR-46 — Anomaly Detection

Identify unusual changes such as:

- Sudden sales decrease
- Unexpected expense spike
- Abnormally high refunds
- Unusual transaction pattern

---

### FR-47 — Recommendations

Future versions may translate analytics into suggestions such as:

- Investigate a declining category.
- Reorder a fast-moving item.
- Follow up with an inactive customer.
- Review an unusually high expense.

These recommendations should explain the underlying evidence rather than present unsupported conclusions.

---

## 15. Non-Functional Requirements

### NFR-01 — Usability

Usability is a critical SME requirement.

The system should be usable by people with limited analytics knowledge.

##### Requirements

- Basic platform use shall not require SQL.
- Basic platform use shall not require Python.
- Basic platform use shall not require database expertise.
- Business terminology should be preferred to technical terminology.
- Errors should be understandable.
- Data-quality warnings should explain what is wrong.
- Upload flows should guide users through required steps.
- Common tasks should require minimal configuration.
- Dashboards should avoid excessive metrics and visual clutter.

A core usability goal is:

> A business owner should be able to upload a valid business dataset and reach useful analytics without writing code.

---

### NFR-02 — Performance

The following are example targets for the project and should be refined through testing:

- Standard dashboard load: approximately 3 seconds or less.
- Common filter interaction: approximately 2 seconds or less.
- Typical API response: approximately 1–2 seconds.
- Long-running imports should show progress.
- Expensive transformations should not block the user interface.

A measurable example:

> 95% of standard dashboard queries should return within 3 seconds for supported SME-scale datasets.

---

### NFR-03 — Reliability

The platform shall:

- Prevent failed imports from overwriting valid datasets.
- Record import failures.
- Record refresh failures.
- Allow safe retries.
- Notify users when scheduled refresh fails.
- Avoid producing partially updated dashboards after failed processing.
- Produce consistent KPI output for identical source data and metric definitions.
- Support idempotent processing where appropriate.

---

### NFR-04 — Data Accuracy

The platform must prioritize trusted values over visual sophistication.

Requirements include:

- Central KPI definitions
- Consistent formulas
- Consistent rounding
- Consistent date handling
- Source traceability
- Transformation traceability
- Validation of critical calculations
- Test coverage for important business metrics

If the source accounting system reports one revenue total while the platform reports another, the discrepancy must be explainable.

---

### NFR-05 — Security

The platform may contain commercially sensitive information such as:

- Revenue
- Profit
- Expenses
- Customer data
- Employee performance
- Supplier data
- Invoice details
- Inventory

Requirements include:

- HTTPS/TLS
- Password hashing
- Secure authentication
- Secure authorization
- Role-based access control
- Encrypted credentials/secrets
- Secure session handling
- Session expiration
- Audit logs
- Protection from common web vulnerabilities
- Secure API access
- Tenant isolation

---

### NFR-06 — Multi-Tenant Isolation

For a SaaS architecture:

```text
Business A
   ↓
Only Business A data

Business B
   ↓
Only Business B data
```

The system must never expose Business B data to users authorized only for Business A.

Tenant-scoped authorization must be enforced server-side and not only through frontend controls.

---

### NFR-07 — Scalability

The platform should be capable of growing from a small portfolio/MVP environment to a larger SaaS workload.

Possible growth path:

```text
10 users
100,000 rows
```

to:

```text
thousands of businesses
millions or more analytical records
```

Requirements:

- Modular scaling.
- Asynchronous handling of long-running jobs.
- Ability to scale ingestion independently.
- Ability to scale analytics workloads independently where necessary.
- Avoid architecture that assumes all processing occurs inside one synchronous API request.

---

### NFR-08 — Affordability

Cost is an important product requirement for the SME market.

The system should:

- Minimize unnecessary infrastructure.
- Optimize storage and compute per tenant.
- Avoid enterprise-only dependencies when simpler alternatives meet requirements.
- Support low-cost initial deployments.
- Avoid expensive per-connector architecture where feasible.
- Permit future pricing tiers.

---

### NFR-09 — Maintainability

The platform architecture should separate concerns such as:

```text
Authentication
Data Ingestion
Transformation
Analytics
Reporting
Notifications
```

Requirements:

- Modular application structure.
- Clear component responsibilities.
- Documented APIs.
- Version-controlled schema changes.
- Automated tests for critical logic.
- Central metric definitions.
- Reusable connectors.
- Avoid a single monolithic source file containing unrelated concerns.

---

### NFR-10 — Extensibility

The architecture should support future integrations.

Potential future connectors:

- Shopify
- QuickBooks
- Zoho
- Stripe
- Meta Ads
- Google Ads
- POS systems
- CRM systems
- ERP systems

Conceptually:

```text
             Connector Interface
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      CSV       PostgreSQL    Shopify
```

Adding a new connector should require minimal changes to unrelated modules.

---

### NFR-11 — Availability

For a portfolio or MVP system, a strict enterprise SLA is not required.

The platform should:

- Be available during normal business usage.
- Recover gracefully from service failure.
- Provide understandable errors when dependent services are unavailable.

Formal uptime targets can be added when the platform becomes production SaaS.

---

### NFR-12 — Backup and Recovery

The platform should support:

- Regular database backups.
- Recovery procedures.
- Backup verification.
- Retention of original uploaded files according to policy.
- Point-in-time recovery where infrastructure supports it.
- Recovery testing for critical data.

---

### NFR-13 — Observability

The system should provide sufficient operational visibility.

Monitor:

- API failures
- Login failures
- Import failures
- Import duration
- Processing duration
- Refresh failures
- Database failures
- Query latency
- Background-job failures

Use:

- Application logs
- Error reporting
- Health checks
- Metrics
- Alerts for critical system failures

---

### NFR-14 — Compatibility

The application should support current versions of major browsers such as:

- Chrome
- Edge
- Firefox
- Safari

The UI should be responsive for:

- Desktop
- Tablet
- Practical mobile viewing

A native mobile application is not required for the MVP.

---

## 16. SME-Specific Product Principles

### 16.1 Simplicity Over Enterprise Complexity

The system should not require users to understand:

- Data warehouses
- Semantic layers
- SQL
- Star schemas
- ETL terminology
- BI administration

The platform may use these internally while presenting a simpler experience.

---

### 16.2 Small Number of Useful KPIs

A dashboard with dozens of metrics may overwhelm users.

The default experience should emphasize roughly 5–15 important metrics for a particular business context rather than maximizing metric count.

---

### 16.3 Spreadsheet Compatibility

Excel and CSV support should be treated as a core product capability.

The goal is not to force businesses to abandon spreadsheets immediately, but to automate and improve the workflow around them.

---

### 16.4 Automation of Repetitive Work

The product should minimize repeated manual:

- Downloading
- Copying
- Cleaning
- Combining
- Refreshing
- Recalculating

---

### 16.5 Trust Before AI

Priority order should be:

```text
Reliable Data
   ↓
Reliable Metrics
   ↓
Useful Dashboard
   ↓
Alerts
   ↓
Forecasting / AI
```

Advanced AI features should not be built before the platform can produce trusted basic analytics.

---

### 16.6 Actionable Analytics

The platform should help the user progress through:

```text
What happened?
        ↓
Why?
        ↓
Where?
        ↓
What needs attention?
```

---

### 16.7 Data Freshness Must Be Visible

Users should never have to guess whether a dashboard shows current or stale data.

---

## 17. MVP Prioritization

### 17.1 Must-Have MVP

#### Platform

- User registration
- Login
- Logout
- Password reset
- Business workspace
- Owner/Admin role
- Manager role
- Viewer role
- Tenant isolation

#### Data

- CSV import
- Excel import
- Data preview
- Schema detection
- Data-type detection
- Missing-value detection
- Duplicate detection
- Data cleaning
- Raw-data preservation
- Dataset relationships

#### Analytics

- Revenue
- Orders
- Units sold
- Average Order Value
- Sales growth
- Product performance
- Customer performance
- Profitability
- Basic cash-flow visibility

#### Dashboard

- KPI cards
- Sales trend
- Product analysis
- Customer analysis
- Date filtering
- Business filters
- Drill-down
- Last updated timestamp

#### Reporting

- CSV export
- Excel export
- PDF export

#### Reliability and Security

- Authentication
- Authorization
- Secure passwords
- Tenant isolation
- Basic logs
- Error handling
- Data validation

---

### 17.2 Phase 1.5

- Alerts
- Scheduled reports
- Automated daily refresh
- Inventory monitoring
- More advanced data-quality reporting
- Email notifications

---

### 17.3 Phase 2

- Accounting integrations
- POS integrations
- CRM integrations
- E-commerce integrations
- Marketing integrations
- Natural-language analytics
- Forecasting
- Anomaly detection
- Recommendations
- Advanced connector ecosystem

---

## 18. Features That Are Low Priority for the Initial SME MVP

The following should generally not be first priorities:

- Real-time streaming analytics
- Complex OLAP administration
- Enterprise-grade semantic modeling interfaces
- Large governance suites
- Highly granular enterprise permission systems
- Custom ML model development
- Large-scale drag-and-drop BI authoring
- Complex data-science notebooks inside the business-user application

These capabilities may be useful later but can distract from the small-business problem.

---

## 19. Product Architecture Concept

The user-facing flow should be approximately:

```text
                    USER
                      │
                Create Business
                      │
                      ▼
              Upload / Connect Data
                      │
                      ▼
               Data Validation
                      │
                      ▼
            Cleaning / Transformation
                      │
                      ▼
              Business Data Model
                      │
              ┌───────┼───────┐
              ▼       ▼       ▼
            Sales   Customer Product
            KPIs     KPIs     KPIs
              │       │       │
              └───────┼───────┘
                      ▼
                   Dashboard
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        Filters     Reports      Alerts
```

---

## 20. Fundamental Product Requirements

The platform can be reduced to five fundamental requirements:

```text
1. COLLECT THE DATA
2. TRUST THE DATA
3. UNDERSTAND THE DATA
4. FIND PROBLEMS
5. TAKE ACTION
```

Mapped to capabilities:

```text
COLLECT
→ uploads + connectors

TRUST
→ validation + cleaning + consistent KPIs

UNDERSTAND
→ dashboards + filters + drill-down

FIND
→ comparisons + data quality + anomalies + alerts

ACT
→ notifications + reports + recommendations
```

---

## 21. Core Product Proposition

> A self-service analytics platform for small businesses that consolidates operational data, automatically calculates important business metrics, and presents simple dashboards, alerts, and reports without requiring users to understand databases, SQL, or traditional BI tools.

---

## 22. Requirement-to-Development Flow

Once these requirements are accepted, development should proceed through:

```text
Requirements
   ↓
Actors
   ↓
Use Cases
   ↓
Acceptance Criteria
   ↓
System Architecture
   ↓
Data Model
   ↓
API Design
   ↓
UI / UX Design
   ↓
Development Backlog
   ↓
Implementation
   ↓
Testing
```

---

## 23. Recommended Requirement Record Format

Each final implementation requirement should eventually be tracked using a structure similar to:

```text
Requirement ID:
FR-XX / NFR-XX

Name:
Short requirement name

Description:
What the system must do

Actor:
Who uses it

Priority:
Must / Should / Could / Won't

Acceptance Criteria:
Conditions that must be true before the requirement is considered complete

Phase:
MVP / Phase 1.5 / Phase 2

Dependencies:
Other requirements or systems required
```

This allows the document to evolve into a complete Software Requirements Specification and development backlog.
