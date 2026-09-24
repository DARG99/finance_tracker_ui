import { displayDate, parseDate } from "./dates";
import { useEffect, useState, type SubmitEvent } from "react";
import { Alert, Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { getApiErrorMessage } from "../api/errors";
import type { Transaction, TransactionUpdate } from "../schemas/transactionSchema";
import { transactionService, type TransactionOption } from "../services/transactionService";

export default function EditTransactionModal({ transaction, onClose, onSaved }: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [date, setDate] = useState(displayDate(transaction.transactionDate ?? ""));
  const [source, setSource] = useState(String(transaction.sourceFundingSourceId ?? ""));
  const [destination, setDestination] = useState(String(transaction.destinationFundingSourceId ?? ""));
  const [category, setCategory] = useState(String(transaction.categoryId ?? ""));
  const [description, setDescription] = useState(transaction.description ?? "");
  const [funding, setFunding] = useState<TransactionOption[]>([]);
  const [categories, setCategories] = useState<TransactionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const type = transaction.type;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      transactionService.getFundingSources(controller.signal),
      type === "EXPENSE" ? transactionService.getCategories(controller.signal) : Promise.resolve([]),
    ]).then(([sources, options]) => {
      if (controller.signal.aborted) return;
      setFunding(sources);
      setCategories(options);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(getApiErrorMessage(error, "Unable to load options. Close this dialog and try again."));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [type]);

  const hasSource = funding.some((option) => String(option.id) === source);
  const hasDestination = funding.some((option) => String(option.id) === destination);
  const hasChanges = Number(amount) !== transaction.amount
    || parseDate(date) !== (transaction.transactionDate ?? "")
    || description.trim() !== (transaction.description ?? "").trim()
    || (type !== "INCOME" && source !== String(transaction.sourceFundingSourceId ?? ""))
    || (type !== "EXPENSE" && destination !== String(transaction.destinationFundingSourceId ?? ""))
    || (type === "EXPENSE" && category !== String(transaction.categoryId ?? ""));
  const valid = Number.isFinite(Number(amount)) && Number(amount) > 0 && parseDate(date) !== null
    && (type === "INCOME" ? hasDestination : hasSource)
    && (type !== "EXPENSE" || categories.some((option) => String(option.id) === category))
    && (type !== "TRANSFER" || (hasDestination && source !== destination));

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || !valid || saving || loading || loadError || !event.currentTarget.checkValidity()) return;
    const update: TransactionUpdate = {
      amount: Number(amount), transactionDate: parseDate(date)!, description: description.trim(),
      ...(type !== "INCOME" ? { sourceFundingSourceId: Number(source) } : {}),
      ...(type !== "EXPENSE" ? { destinationFundingSourceId: Number(destination) } : {}),
      ...(type === "EXPENSE" ? { categoryId: Number(category) } : {}),
    };
    setSaving(true);
    setError(null);
    try {
      await transactionService.update(transaction.id, update);
      onSaved();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Unable to save changes. Please try again."));
      setSaving(false);
    }
  }

  return (
    <Modal show onHide={() => { if (!saving) onClose(); }} centered scrollable backdrop={saving ? "static" : true} keyboard={!saving} aria-labelledby="edit-transaction-title">
      <Modal.Header closeButton={!saving}>
        <Modal.Title id="edit-transaction-title" className="h5">Edit transaction</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-secondary">Type: <strong>{type}</strong> · Cannot be changed</p>
        {loading && <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading options…</p>}
        {loadError && <p className="text-danger small" role="alert"><i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />{loadError}</p>}
        {error && <Alert variant="danger" role="alert">{error}</Alert>}
        <Form id="edit-transaction-form" onSubmit={save} aria-busy={saving}>
          <fieldset disabled={saving || loading || Boolean(loadError)}>
            <Row className="g-3 mb-3">
              <Col xs={6}><Form.Group controlId="edit-amount">
                <Form.Label>Amount</Form.Label>
                <Form.Control type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
              </Form.Group></Col>
              <Col xs={6}><Form.Group controlId="edit-date">
                <Form.Label>Date (dd/mm/yyyy)</Form.Label>
                <Form.Control type="text" placeholder="dd/mm/yyyy" maxLength={10} required value={date} isInvalid={date.length > 0 && parseDate(date) === null} onChange={(event) => setDate(event.target.value)} />
              </Form.Group></Col>
            </Row>
            <Row className="g-3 mb-3">
              {type !== "INCOME" && <Col xs={type === "TRANSFER" ? 6 : 12}><Form.Group controlId="edit-source">
                <Form.Label>{type === "TRANSFER" ? "From" : "Funding source"}</Form.Label>
                <Form.Select required value={source} onChange={(event) => {
                  setSource(event.target.value);
                  if (event.target.value === destination) setDestination("");
                }}>
                  <option value="" disabled hidden>Choose source</option>
                  {funding.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </Form.Select>
              </Form.Group></Col>}
              {type !== "EXPENSE" && <Col xs={type === "TRANSFER" ? 6 : 12}><Form.Group controlId="edit-destination">
                <Form.Label>{type === "TRANSFER" ? "To" : "Receiving funding source"}</Form.Label>
                <Form.Select required value={destination} onChange={(event) => setDestination(event.target.value)}>
                  <option value="" disabled hidden>Choose destination</option>
                  {funding.map((option) => <option key={option.id} value={option.id} disabled={type === "TRANSFER" && String(option.id) === source}>{option.name}</option>)}
                </Form.Select>
              </Form.Group></Col>}
            </Row>
            {type === "EXPENSE" && <Form.Group controlId="edit-category" className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select required value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="" disabled hidden>Choose a category</option>
                {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Form.Select>
            </Form.Group>}
            <Form.Group controlId="edit-description">
              <Form.Label>Description <span className="text-secondary">(optional)</span></Form.Label>
              <Form.Control as="textarea" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
            </Form.Group>
          </fieldset>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="submit" form="edit-transaction-form" variant="success" disabled={!hasChanges || !valid || saving || loading || Boolean(loadError)}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
