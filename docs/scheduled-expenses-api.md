# Scheduled expenses and balance predictions

The backend supports scheduling and forecasts. Paths below are relative to `/api`.

- `POST /transactions/scheduled` accepts the existing expense payload and returns
  the complete transaction with `status: "SCHEDULED"` (201). The date must be
  strictly after today in the account timezone. Invalid requests return 400 and
  never post immediately.
- `PATCH /transactions/{id}/schedule` accepts expense update fields and returns
  the complete transaction. Future dates schedule; today/past dates post. Moving
  a posted expense into the future reverses its debit atomically. Linked
  reimbursements or subscription payment dependencies return 409.
- Ordinary transaction POST/PATCH also schedule future expenses and reject
  future income/transfers. Amounts must be positive with at most two decimal places.
- Transaction list/detail responses include `SCHEDULED` or `POSTED`. Lists include
  manual schedules but exclude unposted subscription occurrences before pagination.
  Filtering and ordering use the transaction date.
- Deleting a manual schedule cancels it without a debit. Deleting a posted expense
  reverses its debit. An unposted subscription occurrence returns 409 directing the
  caller to subscription management. Deactivation suppresses virtual occurrences
  and deletes unposted generated occurrences, preserving posted history.
- `GET /dashboard/forecast` now defaults to `NEXT_PAYDAY`. It returns `asOf`,
  inclusive `through`, and every funding source with `id`, `scheduledExpenses`,
  `subscriptionExpenses`, and `predictedBalance`. Missing payday settings return
  409 with a setup instruction. Explicit `THIS_MONTH` and `NEXT_MONTH` requests
  remain supported for older clients; invalid horizons return 400.

## Payday settings and frontend integration

The forecast answers **“How much will I have left before my next salary?”**
The user chooses their normal monthly payday, rather than inferring it from
income descriptions such as “salario” or “salário”. An early, late, or bonus
payment should not silently change the forecast period.

- `GET /users/me/payday` returns `{"paydayDay":25}`, or `{"paydayDay":null}` before
  configuration. The setting belongs to the authenticated user.
- `PATCH /users/me/payday` accepts `{"paydayDay":25}` and returns the saved setting.
  A day from 1 to 31 is required; missing, null, or out-of-range values return 400.
- Remove the current/next-month selector from the frontend. When no payday is
  configured, show a payday setup control. Once saved, fetch
  `/dashboard/forecast` (without the old `horizon=NEXT_MONTH` query).
- Label the result “Money left before payday” and display the returned `through`
  date as the last day covered. Refetch after changing payday or posting income.

For payday on the 25th, October 11 forecasts through October 24. On October 25,
a new cycle starts and the forecast runs through November 24. The boundary is
calendar-based in the account timezone. Days 29–31 clamp to the last day of a
short month, preserving the chosen day for later months. There is no automatic
weekend/holiday adjustment.

The last salary is already part of the current balance: it must not be added
again or used as a replacement for that balance. Future salaries are never
credited by the forecast. On payday, the new period starts even if salary has
not yet been recorded; the balance updates when the income is actually posted.
A negative prediction still means recorded funds do not cover the included
costs. Early or late salary payments do not move the configured boundary.

Forecasts subtract unpaid manual schedules and active subscription occurrences
from the current balance, without assuming future income. They do not use the
spending year. Generated occurrences replace virtual occurrences by subscription
ID and occurrence date; their costs count only as subscription expenses.

## Posting, dates, and concurrency

`users.timezone` stores each account's IANA timezone, defaulting to `Europe/Lisbon`
to preserve the previous billing timezone. Configure it in the database; there is
currently no timezone settings endpoint. All date decisions read this value on
the server, independent of the browser and JVM timezone.

A worker runs on startup and every 60 seconds (configurable with
`finance.posting-delay-ms`). It catches up all unpaid due dates in the account's
local calendar. The backend must be running for background posting; an outage
is recovered on startup. Dashboard, forecast, funding-source, subscription, and
transaction reads also reconcile due payments first. Posting failures roll back
and fail the read rather than returning partial results.

Every balance writer and snapshot reader first takes a PostgreSQL row lock on
the account. This serializes posting, edits, deletion, and forecasts across
processes. Each worker account has its own database transaction. Posting changes
status and balance in the same transaction; unique subscription/date receipts
prevent retry duplication. Receipts remain after deleting a posted payment so
it cannot be generated again. Cancellation physically deletes unposted records
under the same lock, so a delayed worker cannot revive them.

Monthly and yearly billing share one recurrence engine with forecasts. Billing
day remains anchored across short months. A February 29 yearly anniversary
clamps to February 28 in ordinary years and returns to February 29 in leap years.
Subscription creation and edits reconcile due occurrences before returning the
next payment date. Changing recurrence settings rebuilds upcoming generated costs
from the new settings; posted payments remain unchanged.

Expense posting permits a negative balance so insufficient funds cannot prevent
a due expense from posting. Transfer validation retains its existing behavior.
All money calculations use `BigDecimal`. Actual overview totals, charts, and
reimbursement eligibility include posted records only.

## Migration and verification

Flyway `V12__account_payday.sql` adds the nullable `users.payday_day` setting.
Existing accounts must select a payday before using the new default forecast.
Deploy the frontend setup control alongside this change; older explicit month
requests continue to work.


Flyway `V11__scheduled_expenses.sql` adds status, timezone, and stable subscription
occurrence links, and backfills existing payment links. Existing transactions
remain posted, including any previously posted future-dated records: their
balances have already been affected.

The PostgreSQL integration tests require a separate, disposable database. They
exercise migrations, actual totals, forecasts, source changes, paid/generated
occurrences, ownership, API validation, timezone boundaries, and concurrent
posting/edit/delete calls. The recurrence unit tests cover month ends and leap
anniversaries. Example, after creating `finance_schedule_test`:

```sh
FINANCE_TEST_DB=jdbc:postgresql://localhost:5432/finance_schedule_test ./mvnw test \
  -Dspring.datasource.url=jdbc:postgresql://localhost:5432/finance_schedule_test \
  -Dfinance.scheduling.enabled=false
```

Supply test database credentials via Spring datasource properties if they differ
from the local defaults. Without `FINANCE_TEST_DB`, the scheduling integration
test class is skipped. The pre-existing context test still needs a PostgreSQL
datasource, so specify the separate test URL for the full suite.
