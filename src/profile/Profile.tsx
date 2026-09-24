import { useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from "react-bootstrap";
import { profileService } from "../services/profileService";
import { getApiErrorMessage } from "../api/errors";

function CreateForm({ kind }: { kind: "funding-source" | "category" }) {
  const isFundingSource = kind === "funding-source";
  const label = isFundingSource ? "funding source" : "category";
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canSubmit = name.trim().length > 0 && !saving
    && (!isFundingSource || initialBalance === "" || Number.isFinite(Number(initialBalance)));

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !event.currentTarget.checkValidity()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const trimmedName = name.trim();
    try {
      if (isFundingSource) {
        await profileService.addFundingSource(trimmedName, initialBalance === "" ? undefined : Number(initialBalance));
      } else {
        await profileService.addCategory(trimmedName);
      }
      setSuccess(`${trimmedName} added successfully.`);
      setName("");
      setInitialBalance("");
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, `Unable to add ${label}. Please try again.`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="section" className="h-100 shadow-sm" aria-labelledby={`${kind}-title`}>
      <Card.Body className="p-3 p-sm-4">
        <h2 id={`${kind}-title`} className="h5 mb-2">
          <i className={`bi ${isFundingSource ? "bi-wallet2" : "bi-tags"} text-success me-2`} aria-hidden="true" />
          Add {label}
        </h2>
        <p className="text-secondary small mb-4">
          {isFundingSource ? "Track a bank account, wallet, or another place you keep money." : "Organize your expenses with categories such as Groceries or Transport."}
        </p>
        {success && <Alert variant="success" role="status">{success}</Alert>}
        {error && <Alert variant="danger" role="alert">{error}</Alert>}
        <Form onSubmit={submit} aria-busy={saving}>
          <fieldset disabled={saving}>
            <Form.Group controlId={`${kind}-name`} className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control className="py-2" required value={name} onChange={(event) => setName(event.target.value)} placeholder={isFundingSource ? "e.g. Bank account" : "e.g. Groceries"} />
            </Form.Group>
            {isFundingSource && <Form.Group controlId="funding-source-balance" className="mb-3">
              <Form.Label>Initial balance <span className="text-secondary">(optional)</span></Form.Label>
              <Form.Control className="py-2" type="number" inputMode="decimal" step="0.01" value={initialBalance} onChange={(event) => setInitialBalance(event.target.value)} placeholder="0.00" aria-describedby="initial-balance-help" />
              <Form.Text id="initial-balance-help">Leave blank to start at zero. An initial balance sets the account balance; it does not create an income transaction.</Form.Text>
            </Form.Group>}
            <Button type="submit" variant="success" className="w-100 py-2 mt-2" disabled={!canSubmit}>
              {saving && <Spinner as="span" size="sm" className="me-2" aria-hidden="true" />}
              {saving ? "Adding…" : `Add ${label}`}
            </Button>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default function Profile() {
  return (
    <Container as="main" className="px-3 px-sm-4 py-4 py-md-5">
      <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3"><i className="bi bi-person-circle me-2" aria-hidden="true" />Profile</h1>
          <p className="text-secondary mb-0">Set up your funding sources and expense categories.</p>
        </div>
        <Link to="/admin" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 py-2">
          <i className="bi bi-shield-lock" aria-hidden="true" />
          Admin
        </Link>
      </header>
      <Row className="g-3 g-md-4">
        <Col xs={12} md={6}><CreateForm kind="funding-source" /></Col>
        <Col xs={12} md={6}><CreateForm kind="category" /></Col>
      </Row>
    </Container>
  );
}
