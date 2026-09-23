import { useRef, useState, type SubmitEvent } from "react";
import axios from "axios";
import { Alert, Button, Card, Container, Form, Modal, Spinner } from "react-bootstrap";
import { adminService, adminUserIdSchema } from "../services/adminService";
import { getApiErrorMessage } from "../api/errors";

export default function Admin() {
  const [userId, setUserId] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const validId = adminUserIdSchema.safeParse(userId).success;

  function review(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validId || inFlight.current) return;
    setError(null);
    setSuccess(null);
    setConfirmation("");
    setTargetId(userId.trim());
  }

  async function execute(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetId || confirmation !== targetId || inFlight.current) return;
    const id = targetId;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await adminService.deleteAllTransactionsForUser(id);
      setSuccess(`Deleted ${result.deletedTransactions} transactions for user ${id}. All of this user's funding-source balances have been reset to zero.`);
      setUserId("");
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      setError(status === 403
        ? "Access denied. Sign in with an administrator account and a fresh token to run this command."
        : status === 404
          ? `User ${id} was not found.`
          : getApiErrorMessage(error, `Could not confirm the result for user ${id}. Check their transactions and balances before trying again.`));
    } finally {
      setTargetId(null);
      setConfirmation("");
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Container as="main" className="px-3 px-sm-4 py-4 py-md-5">
      <header className="mb-4">
        <h1 className="h3"><i className="bi bi-shield-lock me-2" aria-hidden="true" />Admin commands</h1>
        <p className="text-secondary mb-0">Administrative actions require an administrator account.</p>
      </header>
      {success && <Alert variant="success" role="status">{success}</Alert>}
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <Card as="section" className="shadow-sm border-danger" aria-labelledby="delete-transactions-title" style={{ maxWidth: "680px" }}>
        <Card.Body className="p-3 p-sm-4">
          <h2 id="delete-transactions-title" className="h5">Delete all user transactions</h2>
          <p className="text-secondary">Permanently delete every transaction for a user and reset all of their funding-source balances to zero. This cannot be undone.</p>
          <Form onSubmit={review}>
            <Form.Group controlId="admin-user-id" className="mb-3">
              <Form.Label>User ID</Form.Label>
              <Form.Control required type="text" inputMode="numeric" value={userId} disabled={busy} onChange={(event) => setUserId(event.target.value)} aria-describedby="admin-user-id-help" isInvalid={userId.length > 0 && !validId} placeholder="Enter a user ID" />
              <Form.Text id="admin-user-id-help">Enter the positive whole-number ID of the user to reset.</Form.Text>
              <Form.Control.Feedback type="invalid">Enter a valid user ID (1–9223372036854775807).</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit" variant="outline-danger" disabled={!validId || busy}>Review deletion</Button>
          </Form>
        </Card.Body>
      </Card>
      <Modal show={targetId !== null} onHide={() => { if (!busy) setTargetId(null); }} backdrop="static" keyboard={!busy} centered aria-labelledby="confirm-deletion-title">
        <Modal.Header closeButton={!busy}>
          <Modal.Title id="confirm-deletion-title">Reset user {targetId}?</Modal.Title>
        </Modal.Header>
        <Form onSubmit={execute} aria-busy={busy}>
          <Modal.Body>
            <p>This permanently deletes <strong>all transactions</strong> for user <strong>{targetId}</strong> and sets <strong>every funding-source balance to zero</strong>, including any initial balances.</p>
            <p>This action cannot be undone.</p>
            <Form.Group controlId="admin-confirm-user-id">
              <Form.Label>Type user ID <strong>{targetId}</strong> to confirm</Form.Label>
              <Form.Control autoFocus required autoComplete="off" inputMode="numeric" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" disabled={busy} onClick={() => setTargetId(null)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy || confirmation !== targetId}>
              {busy && <Spinner as="span" size="sm" className="me-2" aria-hidden="true" />}
              {busy ? "Deleting…" : "Delete all transactions"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
