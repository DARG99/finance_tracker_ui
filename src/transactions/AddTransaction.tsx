import { useEffect, useState, type SubmitEvent } from "react";
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import "./AddTransaction.css";
import { getApiErrorMessage } from "../api/errors";
import { transactionService, type NewTransaction, type TransactionOption, type TransactionType } from "../services/transactionService";

const transactionTypes = [
  { value: "EXPENSE", label: "Expense", color: "danger" },
  { value: "INCOME", label: "Income", color: "success" },
  { value: "TRANSFER", label: "Transfer", color: "warning" },
] as const;

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function useOptions(loader: (signal?: AbortSignal) => Promise<TransactionOption[]>) {
  const [options, setOptions] = useState<TransactionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setOptions(data); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(error, "Unable to load options. Please try again."));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loader]);

  return { options, loading, error };
}

export default function AddTransaction() {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const funding = useOptions(transactionService.getFundingSources);
  const categories = useOptions(transactionService.getCategories);
  const selectedType = transactionTypes.find((option) => option.value === type)!;
  const unavailable = funding.loading || Boolean(funding.error) || funding.options.length === 0
    || (type === "EXPENSE" && (categories.loading || Boolean(categories.error) || categories.options.length === 0))
    || (type === "TRANSFER" && funding.options.length < 2);
  const hasSource = funding.options.some((option) => String(option.id) === source);
  const hasDestination = funding.options.some((option) => String(option.id) === destination);
  const hasCategory = categories.options.some((option) => String(option.id) === category);
  const hasRequiredFields = Number.isFinite(Number(amount)) && Number(amount) > 0 && date !== ""
    && (type === "EXPENSE"
      ? hasSource && hasCategory
      : type === "INCOME"
        ? hasDestination
        : hasSource && hasDestination && source !== destination);
  const canSubmit = !saving && !unavailable && hasRequiredFields;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !event.currentTarget.checkValidity()) return;
    setError(null);
    setSuccess(null);
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (type === "TRANSFER" && source === destination) {
      setError("Choose different funding sources for the transfer.");
      return;
    }
    const common = { amount: Number(amount), transactionDate: date };
    const optionalDescription = description.trim() || undefined;
    const transaction: NewTransaction = type === "EXPENSE"
      ? { ...common, type, sourceFundingSourceId: Number(source), categoryId: Number(category), description: optionalDescription }
      : type === "INCOME"
        ? { ...common, type, destinationFundingSourceId: Number(destination) }
        : { ...common, type, sourceFundingSourceId: Number(source), destinationFundingSourceId: Number(destination), description: optionalDescription };
    setSaving(true);
    try {
      await transactionService.create(transaction);
      setSuccess(`${selectedType.label} added successfully.`);
      setAmount("");
      setDate(today());
      setSource("");
      setDestination("");
      setCategory("");
      setDescription("");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Unable to add the transaction. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="transaction-page bg-light">
      <Container as="main" className="px-3 py-2 py-md-4">
        <Row className="justify-content-center">
          <Col xs={12} md={9} lg={7} xl={6} className="transaction-column">
            <h1 className="h3 mb-2">Add transaction</h1>
            <p className="text-secondary mb-4 d-none d-md-block">Record an expense, income, or a transfer between your funding sources.</p>
            <Card className="shadow-sm">
              <Card.Body className="p-3 p-sm-4">
                <div role="group" aria-label="Transaction type" className="d-flex gap-2 mb-4">
                  {transactionTypes.map((option) => (
                    <Button key={option.value} variant={type === option.value ? option.color : `outline-${option.color}`}
                      className={`flex-fill py-3 px-1${option.value === "TRANSFER" && type !== "TRANSFER" ? " text-dark" : ""}`}
                      aria-pressed={type === option.value} disabled={saving}
                      onClick={() => { setType(option.value); setError(null); setSuccess(null); }}>
                      {option.label}
                    </Button>
                  ))}
                </div>
                {success && <Alert variant="success" role="status">{success}</Alert>}
                {error && <Alert variant="danger" role="alert">{error}</Alert>}
                <Form onSubmit={submit} aria-busy={saving}>
                  <fieldset disabled={saving}>
                    <legend className="visually-hidden">{selectedType.label} details</legend>
                    <Row className="g-3 mb-3">
                      <Col xs={6}>
                        <Form.Group controlId="transaction-amount">
                          <Form.Label>Amount</Form.Label>
                          <Form.Control className="py-3" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
                        </Form.Group>
                      </Col>
                      <Col xs={6}>
                        <Form.Group controlId="transaction-date">
                          <Form.Label>Date</Form.Label>
                          <Form.Control className="py-3" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-grid gap-2 align-items-end mb-3" style={{ gridTemplateColumns: type === "TRANSFER" ? "minmax(0, 1fr) auto minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
                    {type !== "INCOME" && <Form.Group controlId="transaction-source" style={{ minWidth: 0 }}>
                      <Form.Label>{type === "TRANSFER" ? "From" : "Funding source"}</Form.Label>
                      <Form.Select className="py-3" aria-describedby="funding-status" required value={source} disabled={funding.loading || Boolean(funding.error)} onChange={(event) => {
                        setSource(event.target.value);
                        if (event.target.value === destination) setDestination("");
                      }}>
                        <option value="" disabled hidden>{type === "TRANSFER" ? "Choose source" : "Choose a funding source"}</option>
                        {funding.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </Form.Select>
                    </Form.Group>}
                    {type === "TRANSFER" && <span className="fs-4 text-secondary pb-2" aria-hidden="true">&rarr;</span>}
                    {type !== "EXPENSE" && <Form.Group controlId="transaction-destination" style={{ minWidth: 0 }}>
                      <Form.Label>{type === "TRANSFER" ? "To" : "Receiving funding source"}</Form.Label>
                      <Form.Select className="py-3" aria-describedby="funding-status" required value={destination} disabled={funding.loading || Boolean(funding.error)} onChange={(event) => setDestination(event.target.value)}>
                        <option value="" disabled hidden>{type === "TRANSFER" ? "Choose destination" : "Choose a funding source"}</option>
                        {funding.options.map((option) => <option key={option.id} value={option.id} disabled={type === "TRANSFER" && String(option.id) === source}>{option.name}</option>)}
                      </Form.Select>
                    </Form.Group>}
                    </div>
                    <div id="funding-status">
                      {funding.loading && <p className="small text-secondary mb-2" role="status">Loading funding sources…</p>}
                      {funding.error && <p className="small text-danger mb-2" role="alert"><i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />Unable to load funding sources. Reload the page.</p>}
                      {!funding.loading && !funding.error && funding.options.length === 0 && <p className="small text-secondary mb-2">Add a funding source before recording a transaction.</p>}
                      {!funding.loading && !funding.error && funding.options.length === 1 && type === "TRANSFER" && <p className="small text-secondary mb-2">A transfer needs at least two funding sources.</p>}
                    </div>
                    {type === "EXPENSE" && <Form.Group controlId="transaction-category" className="mb-3">
                      <Form.Label>Category</Form.Label>
                      <Form.Select className="py-3" aria-describedby="category-status" required value={category} disabled={categories.loading || Boolean(categories.error)} onChange={(event) => setCategory(event.target.value)}>
                        <option value="" disabled hidden>Choose a category</option>
                        {categories.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </Form.Select>
                      <div id="category-status">
                        {categories.loading && <p className="small text-secondary mt-1 mb-0" role="status">Loading categories…</p>}
                        {categories.error && <p className="small text-danger mt-1 mb-0" role="alert"><i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />Unable to load categories. Reload the page.</p>}
                        {!categories.loading && !categories.error && categories.options.length === 0 && <p className="small text-secondary mt-1 mb-0">Add a category before recording an expense.</p>}
                      </div>
                    </Form.Group>}
                    {type !== "INCOME" && <Form.Group controlId="transaction-description" className="mb-4">
                      <Form.Label>Description <span className="text-secondary">(optional)</span></Form.Label>
                      <Form.Control as="textarea" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this transaction for?" />
                    </Form.Group>}
                    <Button type="submit" variant={selectedType.color} className="transaction-submit w-100 py-3 mt-2" disabled={!canSubmit}>
                      {saving && <Spinner as="span" size="sm" className="me-2" aria-hidden="true" />}
                      {saving ? "Saving…" : `Add ${selectedType.label.toLowerCase()}`}
                    </Button>
                  </fieldset>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
