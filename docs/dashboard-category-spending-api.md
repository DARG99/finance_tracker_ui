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
