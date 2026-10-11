# Scheduled expenses and balance predictions

The frontend is implemented; the backend work below is required before scheduling
and predictions work. No backend code exists in this repository. Until then,
scheduling fails without falling back to immediate posting, and the dashboard
shows current balances with an unavailable prediction message.

## Product rules

- An expense dated after today is scheduled. Before its due date it affects only
  predictions, never account balances, income/expense totals, cash flow, charts,
  or reimbursable expense eligibility.
- On the due date it becomes a posted expense, exactly once, even when the user
  never opens the app. Use the account's configured timezone consistently for
  scheduling, subscription posting, and forecast dates. Validate dates server-side;
  the browser's local date is only a UI hint.
- Prediction defaults to the end of next month; the alternative is the end of this
  month. This means the remaining costs this month plus all of next month's costs,
  not costs already paid. It is independent of the dashboard's spending year.
- Predicted balance = current balance minus unpaid scheduled expenses minus unpaid
  subscription occurrences through the inclusive horizon. Do not assume future
  salary or other income. Money already received is in the current balance.
- Include active monthly and yearly subscriptions, with every unpaid occurrence
  through the horizon. Exclude inactive subscriptions, paid occurrences, and dates
  beyond the horizon. Use the same recurrence engine as actual billing: preserve
  the billing-day anchor, clamp short months, and define leap-year anniversaries.
- Count a subscription occurrence only once if it already has a generated scheduled
  expense. Use a stable subscription/occurrence identity, never description matching.
  Report that cost in subscriptionExpenses, excluding it from scheduledExpenses.
- Reconcile due expenses/subscriptions before serving actual totals and forecasts,
  or account for overdue unpaid occurrences in the prediction exactly once. Posting
  and forecast reads must use a consistent snapshot. Use decimal money arithmetic.

All paths below are relative to the configured API base (already includes /api).
All endpoints must enforce authenticated ownership of records and referenced IDs.

## Create: POST /transactions/scheduled

Accept the existing expense payload:

```json
{
  "type": "EXPENSE",
  "amount": 650,
  "transactionDate": "2026-11-01",
  "sourceFundingSourceId": 2,
  "categoryId": 3,
  "description": "November rent"
}
```

Return any successful 2xx response. Persist status SCHEDULED without changing any
actual totals. Reject non-expenses and non-future dates with an actionable error.
Never fall back to posting immediately. The frontend deliberately uses a separate
route so an older backend cannot silently ignore a scheduling flag.

## Edit: PATCH /transactions/{id}/schedule

Accept the existing TransactionUpdate fields (amount, transactionDate, description,
sourceFundingSourceId, categoryId). Return the complete updated transaction.

- Existing scheduled expense with future date: update only the schedule/prediction.
- Existing posted expense moved to future: atomically reverse its posted effect,
  then mark SCHEDULED. Reject with 409 if reimbursements or other dependencies make
  this invalid; preserve the original record on failure.
- Existing scheduled expense moved to today/past: post once and return POSTED.
- Enforce expense-only usage and synchronize edits/deletes with the posting worker.

## Existing transaction endpoints

GET /transactions must include manually scheduled expenses as informational entries,
with deletion available. The transactions UI does not offer editing for SCHEDULED
entries. Upcoming subscription occurrences belong on the Subscriptions page, where
users deactivate the subscription; do not expose them as standalone scheduled
expenses in the transactions list. Exclude unposted subscription-generated records
**before pagination**, keeping totalElements/totalPages consistent. Once a
subscription payment is posted, its actual expense appears in transaction history.
GET /transactions/{id} must also support manually scheduled expenses. Both endpoints
return `status: "SCHEDULED" | "POSTED"`. Filtering/pagination uses the transaction's
due date. The frontend accepts omitted status for backward-compatible old records,
but scheduling-enabled servers must supply it.

DELETE /transactions/{id} cancels an unposted scheduled expense without changing
balances. Deactivating a subscription must cancel/suppress all its unposted generated
occurrences and remove their costs from forecasts, while preserving posted payment
history. Do not allow standalone deletion of an unposted subscription occurrence;
return a conflict directing clients to subscription management.
Deleting a posted expense reverses its effect as before. Canceled records
must not be posted by a delayed worker or included in future predictions.

Also enforce date/posting semantics on ordinary POST/PATCH /transactions to protect
other clients. A scheduler must be idempotent across retries/restarts, and recover
missed due dates. Keep subscription creation, payment history, and nextPaymentDate
consistent with the same posting and recurrence rules.

## Prediction: GET /dashboard/forecast?horizon=NEXT_MONTH

Accept THIS_MONTH or NEXT_MONTH. Determine today and the inclusive month end on the
server. Return all funding sources, including those with no upcoming costs:

```json
{
  "asOf": "2026-10-11",
  "through": "2026-11-30",
  "fundingSources": [
    {
      "id": 2,
      "scheduledExpenses": 650,
      "subscriptionExpenses": 40,
      "predictedBalance": 1310
    }
  ]
}
```

In this example the source's current balance is 2000. Costs must be nonnegative;
predictedBalance may be negative. Use ISO date-only strings. Return explicit errors
on failure rather than partial totals. Do not change the existing overview's
meaning: it must remain actual posted totals only.

## Backend acceptance cases

1. Schedule a future expense: balances and charts remain unchanged; prediction falls.
2. Edit amount/source/date and cancel it: prediction updates without actual movement.
3. Reach the due date, retry the worker, and restart it: debit exactly once; prediction
   remains economically consistent as the cost moves into the current balance.
4. Test next-month horizons across December/January, month ends (including January
   31), leap years, yearly subscriptions, inactive subscriptions, and paid occurrences.
5. Test generated subscription expenses: never count both the schedule and recurrence.
6. Test edits/deletes racing with posting, ownership checks, invalid dates, and conflicts.
