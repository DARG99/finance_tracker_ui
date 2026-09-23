import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Modal, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import type { Transaction, TransactionPage } from "../schemas/transactionSchema";
import { transactionService } from "../services/transactionService";
import EditTransactionModal from "./EditTransactionModal";

const labels = { EXPENSE: "Expense", INCOME: "Income", TRANSFER: "Transfer" };
const colors = { EXPENSE: "danger", INCOME: "success", TRANSFER: "warning" };
const amountFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function title(transaction: Transaction) {
  return transaction.categoryName || labels[transaction.type];
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No date";
  // Parse as a local calendar date so time zones cannot shift the day.
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function Transactions() {
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<TransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    transactionService.list(page, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (page > 0 && result.content.length === 0) {
        setPage(Math.max(0, Math.min(page - 1, result.totalPages - 1)));
        return;
      }
      setData(result);
      setLoading(false);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setError(getApiErrorMessage(error, "Unable to load transactions. Please try again."));
      setLoading(false);
    });
    return () => controller.abort();
  }, [page, version]);

  function reload(targetPage = page) {
    setLoading(true);
    setError(null);
    setPage(targetPage);
    setVersion((value) => value + 1);
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await transactionService.remove(deleting.id);
      setDeleting(null);
      setNotice("Transaction deleted.");
      reload(data?.content.length === 1 && page > 0 ? page - 1 : page);
    } catch (error: unknown) {
      setDeleteError(getApiErrorMessage(error, "Unable to delete the transaction. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container as="main" className="px-3 py-4">
      <Row className="justify-content-center"><Col xs={12} lg={9} xl={8}>
        <h1 className="h3 mb-3">Transactions</h1>
        {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}
        {loading && <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading transactions…</p>}
        {error && <Alert variant="danger" role="alert">{error} <Button variant="outline-danger" size="sm" onClick={() => reload()}>Retry</Button></Alert>}
        {!loading && !error && data && <>
          {data.content.length === 0 ? <div className="text-center py-5">
            <i className="bi bi-list-ul display-5 text-secondary" aria-hidden="true" />
            <h2 className="h5 mt-3">No transactions yet</h2>
            <p className="text-secondary">Add your first expense, income, or transfer.</p>
            <Link to="/transactions/new" className="btn btn-success">Add transaction</Link>
          </div> : <>
            <p className="small text-secondary">{data.totalElements} transaction{data.totalElements === 1 ? "" : "s"}</p>
            <ul className="list-unstyled d-grid gap-3">
              {data.content.map((transaction) => <li key={transaction.id}>
                <Card as="article" aria-labelledby={`transaction-${transaction.id}`}>
                  <Card.Body>
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                      <h2 id={`transaction-${transaction.id}`} className="h6 mb-0 text-break">{title(transaction)}</h2>
                      <span className={`fw-bold text-${colors[transaction.type]}`}>
                        <span className="visually-hidden">{labels[transaction.type]} amount: </span>
                        {amountFormat.format(transaction.amount)}
                      </span>
                    </div>
                    {transaction.description && <p className="text-secondary text-break mt-2 mb-2" style={{ whiteSpace: "pre-wrap" }}>{transaction.description}</p>}
                    <p className="small text-secondary text-break mt-2 mb-1">
                      <i className="bi bi-wallet2 me-1" aria-hidden="true" />
                      {transaction.type === "INCOME" ? (transaction.destinationFundingSourceName || "Funding source unavailable")
                        : transaction.type === "TRANSFER" ? `${transaction.sourceFundingSourceName || "Unknown source"} → ${transaction.destinationFundingSourceName || "Unknown destination"}`
                          : (transaction.sourceFundingSourceName || "Funding source unavailable")}
                    </p>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <span className="small text-secondary"><time dateTime={transaction.transactionDate || undefined}>{dateLabel(transaction.transactionDate)}</time> · {labels[transaction.type]}</span>
                      <div className="d-flex gap-2">
                        <Button variant="outline-secondary" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Edit ${title(transaction)}`} onClick={() => setEditing(transaction)}>
                          <i className="bi bi-pencil-square" aria-hidden="true" />
                        </Button>
                        <Button variant="outline-danger" style={{ minWidth: 44, minHeight: 44 }} aria-label={`Delete ${title(transaction)}`} onClick={() => { setDeleting(transaction); setDeleteError(null); }}>
                          <i className="bi bi-trash" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </li>)}
            </ul>
            <nav aria-label="Transaction pages" className="d-flex align-items-center justify-content-between gap-2 mt-4">
              <Button variant="outline-secondary" disabled={data.first} onClick={() => reload(page - 1)}>Previous</Button>
              <span className="small">Page {data.page + 1} of {data.totalPages}</span>
              <Button variant="outline-secondary" disabled={data.last} onClick={() => reload(page + 1)}>Next</Button>
            </nav>
          </>}
        </>}
      </Col></Row>
      {editing && <EditTransactionModal key={editing.id} transaction={editing} onClose={() => setEditing(null)} onSaved={() => {
        setEditing(null);
        setNotice("Transaction updated.");
        reload();
      }} />}
      <Modal show={Boolean(deleting)} onHide={() => { if (!busy) setDeleting(null); }} centered backdrop={busy ? "static" : true} keyboard={!busy} aria-labelledby="delete-transaction-title">
        <Modal.Header closeButton={!busy}><Modal.Title id="delete-transaction-title" className="h5">Delete transaction?</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="mb-0">Delete {deleting ? title(deleting) : "this transaction"}{deleting ? ` (${amountFormat.format(deleting.amount)})` : ""}? Its effect on your funding-source balances will be reversed.</p>
          {deleteError && <Alert variant="danger" role="alert" className="mt-3 mb-0">{deleteError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete transaction"}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
