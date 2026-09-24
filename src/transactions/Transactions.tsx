import { dateFiltersFromSearch, displayDate } from "./dates";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Modal, Row, Spinner } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import type { Transaction, TransactionPage } from "../schemas/transactionSchema";
import { type TransactionFilters, type TransactionOption, type TransactionType, transactionService } from "../services/transactionService";
import EditTransactionModal from "./EditTransactionModal";

const labels = { EXPENSE: "Expense", INCOME: "Income", TRANSFER: "Transfer" };
const colors = { EXPENSE: "danger", INCOME: "success", TRANSFER: "warning" };
const amountFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function title(transaction: Transaction) {
  return transaction.categoryName || labels[transaction.type];
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No date";
  return displayDate(value);
}

export default function Transactions() {
  const { search } = useLocation();
  return <TransactionsList key={search} search={search} />;
}

function TransactionsList({ search }: { search: string }) {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>(() => dateFiltersFromSearch(search));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<TransactionOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesVersion, setCategoriesVersion] = useState(0);
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
    const timer = window.setTimeout(() => {
      setFilters((current) => current.search === description ? current : { ...current, search: description });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [description]);

  useEffect(() => {
    const controller = new AbortController();
    transactionService.getCategories(controller.signal).then((result) => {
      if (!controller.signal.aborted) setCategories(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setCategoriesError(getApiErrorMessage(error, "Unable to load categories."));
    }).finally(() => {
      if (!controller.signal.aborted) setCategoriesLoading(false);
    });
    return () => controller.abort();
  }, [categoriesVersion]);

  useEffect(() => {
    // Cancel the previous request immediately, but wait for description typing to settle.
    if (description !== (filters.search ?? "")) return;
    const controller = new AbortController();
    transactionService.list(page, controller.signal, filters).then((result) => {
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
  }, [page, version, filters, description]);

  function changeFilters(update: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...update }));
    setPage(0);
    setLoading(true);
    setError(null);
  }

  const hasFilters = Boolean(filters.type || filters.categoryId || description.trim() || filters.from || filters.to);

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
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Button variant="outline-secondary" aria-expanded={filtersOpen} aria-controls="transaction-filters" onClick={() => setFiltersOpen((open) => !open)}>
                <i className="bi bi-funnel me-2" aria-hidden="true" />
                {filtersOpen ? "Hide filters" : "Show filters"}{hasFilters ? " · Active" : ""}
              </Button>
              {(filters.from || filters.to) && <span className="small text-secondary">
                {filters.from ? displayDate(filters.from) : "Any date"} – {filters.to ? displayDate(filters.to) : "Any date"}
              </span>}
              {hasFilters && <Button variant="link" size="sm" onClick={() => {
                setDescription("");
                setFilters({});
                setPage(0);
                setLoading(true);
                setError(null);
              }}>Clear filters</Button>}
            </div>
            <div id="transaction-filters" hidden={!filtersOpen} className="mt-3">
            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Group controlId="transaction-type">
                  <Form.Label>Type</Form.Label>
                  <Form.Select value={filters.type ?? ""} onChange={(event) => changeFilters({ type: (event.target.value || undefined) as TransactionType | undefined })}>
                    <option value="">All</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="TRANSFER">Transfer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group controlId="transaction-category">
                  <Form.Label>Category</Form.Label>
                  <Form.Select disabled={categoriesLoading || Boolean(categoriesError)} value={filters.categoryId ?? ""} onChange={(event) => changeFilters({ categoryId: event.target.value ? Number(event.target.value) : undefined })}>
                    <option value="">{categoriesLoading ? "Loading categories…" : "All categories"}</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="transaction-description">
                  <Form.Label>Description</Form.Label>
                  <Form.Control type="search" placeholder="Search descriptions" value={description} onChange={(event) => {
                    setDescription(event.target.value);
                    setPage(0);
                    setLoading(true);
                    setError(null);
                  }} />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group controlId="transaction-from">
                  <Form.Label>From</Form.Label>
                  <Form.Control type="date" value={filters.from ?? ""} max={filters.to || undefined} onChange={(event) => changeFilters({ from: event.target.value })} />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Group controlId="transaction-to">
                  <Form.Label>To</Form.Label>
                  <Form.Control type="date" value={filters.to ?? ""} min={filters.from || undefined} onChange={(event) => changeFilters({ to: event.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            {categoriesError && <Alert variant="danger" className="mt-3 mb-0">{categoriesError} <Button variant="outline-danger" size="sm" onClick={() => { setCategoriesLoading(true); setCategoriesError(null); setCategoriesVersion((value) => value + 1); }}>Retry categories</Button></Alert>}
            </div>
          </Card.Body>
        </Card>
        {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}
        {loading && <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading transactions…</p>}
        {error && <Alert variant="danger" role="alert">{error} <Button variant="outline-danger" size="sm" onClick={() => reload()}>Retry</Button></Alert>}
        {!loading && !error && data && <>
          {data.content.length === 0 ? <div className="text-center py-5">
            <i className="bi bi-list-ul display-5 text-secondary" aria-hidden="true" />
            <h2 className="h5 mt-3">{hasFilters ? "No matching transactions" : "No transactions yet"}</h2>
            <p className="text-secondary">{hasFilters ? "Try adjusting your filters." : "Add your first expense, income, or transfer."}</p>
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
