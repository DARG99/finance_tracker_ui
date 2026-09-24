import { useEffect, useState, type SubmitEvent } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { getApiErrorMessage } from "../api/errors";
import { subscriptionService, type Subscription } from "../services/subscriptionService";
import { transactionService, type TransactionOption } from "../services/transactionService";
import { displayDate, parseDate } from "../transactions/dates";

export default function SubscriptionModal({ subscription, onClose, onSaved }: {
  subscription: Subscription | null;
  onClose: () => void;
  onSaved: (subscription: Subscription) => void;
}) {
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : "");
  const [frequency, setFrequency] = useState<Subscription["frequency"]>(subscription?.frequency ?? "MONTHLY");
  const [date, setDate] = useState(subscription?.nextPaymentDate ?? "");
  const [source, setSource] = useState(String(subscription?.fundingSourceId ?? ""));
  const [category, setCategory] = useState(String(subscription?.categoryId ?? ""));
  const [funding, setFunding] = useState<TransactionOption[]>([]);
  const [categories, setCategories] = useState<TransactionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([transactionService.getFundingSources(controller.signal), transactionService.getCategories(controller.signal)])
      .then(([sources, options]) => {
        if (controller.signal.aborted) return;
        setFunding(sources);
        setCategories(options);
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(getApiErrorMessage(error, "Unable to load funding sources and categories."));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const valid = name.trim().length > 0 && name.trim().length <= 100
    && Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) <= 999999999999.99
    && parseDate(displayDate(date)) !== null
    && funding.some((option) => String(option.id) === source)
    && categories.some((option) => String(option.id) === category);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || saving || loading || loadError || !event.currentTarget.checkValidity()) return;
    setSaving(true);
    setError(null);
    const value = { name: name.trim(), amount: Number(amount), frequency, nextPaymentDate: date, fundingSourceId: Number(source), categoryId: Number(category) };
    try {
      const result = subscription ? await subscriptionService.update(subscription.id, value) : await subscriptionService.create(value);
      onSaved(result);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Unable to save the subscription. Please try again."));
      setSaving(false);
    }
  }

  return <Modal show onHide={() => { if (!saving) onClose(); }} centered scrollable backdrop={saving ? "static" : true} keyboard={!saving} aria-labelledby="subscription-form-title">
    <Modal.Header closeButton={!saving}><Modal.Title id="subscription-form-title" className="h5">{subscription ? "Edit subscription" : "Add subscription"}</Modal.Title></Modal.Header>
    <Modal.Body>
      {loading && <p role="status"><Spinner size="sm" className="me-2" aria-hidden="true" />Loading options…</p>}
      {loadError && <Alert variant="danger">{loadError} <Button variant="outline-danger" size="sm" onClick={() => { setLoading(true); setLoadError(null); setAttempt((value) => value + 1); }}>Retry</Button></Alert>}
      {!loading && !loadError && (!funding.length || !categories.length) && <Alert variant="warning">A funding source and category are required before you can save a subscription.</Alert>}
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <Form id="subscription-form" onSubmit={save} aria-busy={saving}>
        <fieldset disabled={saving || loading || Boolean(loadError)} className="d-grid gap-3">
          <Form.Group controlId="subscription-name"><Form.Label>Name</Form.Label><Form.Control required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Netflix" /></Form.Group>
          <Form.Group controlId="subscription-amount"><Form.Label>Amount</Form.Label><Form.Control type="number" inputMode="decimal" required min="0.01" max="999999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Form.Group>
          <Form.Group controlId="subscription-frequency"><Form.Label>Frequency</Form.Label><Form.Select value={frequency} onChange={(event) => setFrequency(event.target.value as Subscription["frequency"])}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></Form.Select></Form.Group>
          <Form.Group controlId="subscription-date"><Form.Label>Next payment date</Form.Label><Form.Control type="date" required min="0001-01-01" max="9999-12-31" value={date} isInvalid={date.length > 0 && parseDate(displayDate(date)) === null} onChange={(event) => setDate(event.target.value)} /><Form.Control.Feedback type="invalid">Select a valid payment date.</Form.Control.Feedback></Form.Group>
          <Form.Group controlId="subscription-source"><Form.Label>Funding source</Form.Label><Form.Select required value={source} onChange={(event) => setSource(event.target.value)}><option value="" disabled>Choose a funding source</option>{source && !funding.some((option) => String(option.id) === source) && <option value={source} disabled>Funding source unavailable — choose another</option>}{funding.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Form.Select></Form.Group>
          <Form.Group controlId="subscription-category"><Form.Label>Category</Form.Label><Form.Select required value={category} onChange={(event) => setCategory(event.target.value)}><option value="" disabled>Choose a category</option>{category && !categories.some((option) => String(option.id) === category) && <option value={category} disabled>Category unavailable — choose another</option>}{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Form.Select></Form.Group>
        </fieldset>
      </Form>
    </Modal.Body>
    <Modal.Footer><Button variant="outline-secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button variant="success" type="submit" form="subscription-form" disabled={!valid || saving || loading || Boolean(loadError)}>{saving ? "Saving…" : subscription ? "Save changes" : "Add subscription"}</Button></Modal.Footer>
  </Modal>;
}
