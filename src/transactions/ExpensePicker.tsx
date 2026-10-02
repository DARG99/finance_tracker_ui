import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { getApiErrorMessage } from "../api/errors";
import type { ReimbursableExpense, ReimbursableExpensePage } from "../schemas/transactionSchema";
import { transactionService } from "../services/transactionService";
import { displayDate } from "./dates";

const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" });
function expenseLabel(expense: ReimbursableExpense) {
  return [
    displayDate(expense.transactionDate),
    expense.description || expense.categoryName || "Expense without a description",
    expense.description ? expense.categoryName : null,
    expense.sourceFundingSourceName,
    `${money.format(expense.remainingReimbursableAmount)} remaining of ${money.format(expense.amount)}`,
  ].filter(Boolean).join(" · ");
}

export default function ExpensePicker({ value, onChange, disabled = false, selectedLabel }: {
  value: number | null;
  onChange: (id: number) => void;
  disabled?: boolean;
  selectedLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ReimbursableExpensePage | null>(null);
  const [selected, setSelected] = useState<ReimbursableExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
    transactionService.getReimbursableExpenses(page, search, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(error, "Unable to load expenses. Please try again."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, search, attempt]);

  function loadPage(nextPage: number) {
    setLoading(true);
    setError(null);
    setPage(nextPage);
    setAttempt((current) => current + 1);
  }

  const expenses = data?.content.filter((transaction) => transaction.remainingReimbursableAmount > 0) ?? [];
  return <div className="mb-3">
    <Form.Group controlId="reimbursement-expense-search" className="mb-2">
      <Form.Label>Search expenses</Form.Label>
      <Form.Control type="search" placeholder="Search descriptions" value={search} disabled={disabled} onChange={(event) => {
        setSearch(event.target.value);
        setPage(0);
        setLoading(true);
        setError(null);
      }} />
    </Form.Group>
    <Form.Group controlId="reimbursement-expense">
    <Form.Label>Original expense</Form.Label>
    <Form.Select required value={value ?? ""} disabled={disabled || loading || Boolean(error)} onChange={(event) => {
      const id = Number(event.target.value);
      setSelected(expenses.find((expense) => expense.id === id) ?? null);
      onChange(id);
    }} aria-describedby="reimbursement-expense-help">
      <option value="" disabled>Choose the expense being reimbursed</option>
      {value !== null && !expenses.some((expense) => expense.id === value) && <option value={value}>
        {selected?.id === value ? expenseLabel(selected) : selectedLabel || "Selected expense"}
      </option>}
      {expenses.map((expense) => <option key={expense.id} value={expense.id}>{expenseLabel(expense)}</option>)}
    </Form.Select>
    <Form.Text id="reimbursement-expense-help">Only expenses with money left to reimburse are shown. Amounts reflect reimbursements already received.</Form.Text>
    {loading && <p className="small mt-2 mb-0" role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading expenses…</p>}
    {error && <Alert variant="danger" role="alert" className="mt-2">{error} <Button size="sm" variant="outline-danger" disabled={disabled} onClick={() => loadPage(page)}>Retry</Button></Alert>}
    {!loading && !error && data && <>
      {data.totalElements === 0 && <p className="small text-secondary mt-2 mb-0">{search.trim() ? "No matching expenses with an amount left to reimburse. Try another search." : "No expenses left to reimburse. Add the original expense first if it has not been recorded."}</p>}
      {data.totalPages > 1 && <nav aria-label="Original expense pages" className="d-flex flex-wrap align-items-center gap-2 mt-2">
        <Button size="sm" variant="outline-secondary" disabled={disabled || data.first} onClick={() => loadPage(page - 1)}>Previous</Button>
        <span className="small">Page {data.page + 1} of {data.totalPages}</span>
        <Button size="sm" variant="outline-secondary" disabled={disabled || data.last} onClick={() => loadPage(page + 1)}>Next</Button>
      </nav>}
    </>}
    </Form.Group>
  </div>;
}
