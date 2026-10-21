# Monthly category spending

Frontend support is implemented; the backend must add the following field to
`GET /api/dashboard/overview?year=2026` alongside the existing response fields:

```json
{
  "spendingByCategory": [
    { "categoryId": 1, "categoryName": "Food", "amount": 350 }
  ],
  "monthlySpendingByCategory": [
    { "month": 1, "categoryId": 1, "categoryName": "Food", "amount": 200 },
    { "month": 2, "categoryId": 1, "categoryName": "Food", "amount": 150 }
  ]
}
```

This is a partial response example. Keep all existing overview fields unchanged.
The selector filters this new array locally; no extra endpoint or month parameter
is required. The selected dashboard year applies to both category arrays.

## Backend requirements

- Use the authenticated user's transactions only. Validate `year` (1–9999).
- Group by transaction-date month and category ID within the requested calendar
  year, using the same account timezone/date rules as the existing overview.
  Do not group by record creation time. Use a start-inclusive, next-year-exclusive
  date range (handle year 9999 without overflowing the backend date type).
- Include posted spending only, including posted subscription payments. Exclude
  scheduled expenses, unposted subscription occurrences, transfers, and ordinary
  income. Reuse the existing yearly category calculation's reimbursement rules
  consistently at monthly granularity; do not invent a different net-spend rule.
- Return one row per `(month, categoryId)`, with month 1–12, positive integer
  category ID, category display name, and a nonnegative numeric amount, matching
  the current yearly category contract. If net category values can be negative,
  coordinate a change to both category schemas and charts before returning them.
- Aggregate using decimal money arithmetic and round according to the existing
  currency policy. Return JSON numbers, as with the existing overview amounts.
- Return the complete year's breakdown without pagination. Months/categories
  with no spending may be omitted; `[]` means no category spending for the year.
  Omit the field only when the feature is unsupported; do not use `null`.
- Keep annual and monthly category results consistent for each category. Preserve
  the existing treatment of deleted or uncategorized categories in both outputs.

Existing transaction dates, category associations, amounts, status, and owner IDs
should be sufficient; no new stored monthly totals are necessary. An index on
user ID and transaction date may help the aggregation, subject to the query plan.

## Verification

Test multiple categories across multiple months and years, an empty month/year,
year boundaries in the account timezone, another user's transactions, scheduled
versus posted expenses, subscription payments, and reimbursements under the
existing category accounting policy. Verify monthly category totals reconcile
with yearly category totals. In the UI, choose All year and each month, then
change the dashboard year; the category selector resets to All year.

Older backend responses still load the annual chart. Choosing a month without
the new field displays “Monthly category spending is not available yet.”

## Category links to filtered transactions

Clicking a category name, amount, or bar opens Transactions with that category
and the selected period applied. All year selects January 1–December 31 of the
selected dashboard year; a month selects its first through last calendar day.
The active category and dates are visible above the list. Users can change or
clear these filters normally. Links work on refresh and with browser navigation.

Example frontend URL for Food (category 1), February 2026:

```text
/transactions?from=2026-02-01&to=2026-02-28&categoryId=1
```

The frontend uses the existing endpoint, initially requesting:

```http
GET /api/transactions?page=0&size=50&categoryId=1&from=2026-02-01&to=2026-02-28
```

### Backend implementation checklist

No new endpoint or response fields are required for these links. If the existing
transaction endpoint already implements the following contract, only the monthly
overview field described above needs backend work:

- Accept `categoryId` as a positive integer, and `from` / `to` as ISO calendar
  dates (`YYYY-MM-DD`). Validate dates and reject reversed ranges with HTTP 400.
- Combine category and date constraints with AND, scoped to the authenticated
  user. Filter by the stable category ID returned in the dashboard, not its name.
  Never return another user's transactions, even for a supplied category ID.
- Treat both date endpoints as inclusive. Use the same transaction-date and
  timezone rules as the overview. For timestamp storage, include the whole final
  day (typically before the start of the next day), with safe handling of 9999-12-31.
- Apply filters before pagination and counting. Return the existing transaction
  page shape with filtered `totalElements`, `totalPages`, and first/last flags.
  Keep ordering deterministic across pages, using an ID tie-breaker as needed.
- Preserve existing behavior for deleted categories; historical category IDs
  returned by the overview must remain usable for filtering historical records.

The link intentionally applies only category and date filters. It shows all
matching transactions under the existing listing rules, including scheduled
records if the endpoint normally returns them. It does not set an expense,
posting-status, or reimbursement filter. Consequently, list amounts are not
promised to sum to the dashboard's posted/net spending total. Reimbursements
without that category association follow the existing category-filter rules.

### Verification for category navigation

Test a category with transactions inside and outside the selected month, another
category in the same month, February in leap and non-leap years, December, and
All year. Verify combined filters on every page, accurate filtered counts, empty
results, ownership isolation, and transactions on both date boundaries. In the
UI, check keyboard activation, direct-link refresh, browser back/forward,
changing filters, clearing filters, and a historical category missing from the
current category options.
