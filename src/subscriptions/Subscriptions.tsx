import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Badge, Button, Card, Col, Container, Modal, Row, Spinner } from "react-bootstrap";
import { getApiErrorMessage } from "../api/errors";
import { subscriptionService, type Subscription } from "../services/subscriptionService";
import { displayDate } from "../transactions/dates";
import SubscriptionModal from "./SubscriptionModal";

const amountFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const frequencies = { MONTHLY: "Monthly", YEARLY: "Yearly" };

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ subscription: Subscription | null } | null>(null);
  const [changing, setChanging] = useState<Subscription | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    subscriptionService.list(controller.signal).then((result) => {
      if (!controller.signal.aborted) setSubscriptions(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(error, "Unable to load subscriptions. Please try again."));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [version]);

  function reload() {
    setLoading(true);
    setError(null);
    setVersion((value) => value + 1);
  }

  async function changeStatus() {
    if (!changing || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      if (changing.active) await subscriptionService.deactivate(changing.id);
      else await subscriptionService.update(changing.id, { active: true });
      setNotice(`${changing.name} ${changing.active ? "deactivated" : "reactivated"}.`);
      setChanging(null);
      reload();
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, "Unable to change the subscription status. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError(null);
    setDeleteConflict(false);
    try {
      await subscriptionService.remove(deleting.id);
      setNotice(`${deleting.name} deleted.`);
      setDeleting(null);
      reload();
    } catch (error: unknown) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setDeleteConflict(conflict);
      setDeleteError(getApiErrorMessage(error, conflict
        ? "This subscription has payment history and cannot be deleted. Deactivate it instead."
        : "Unable to delete the subscription. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return <Container as="main" className="px-3 py-4">
    <Row className="justify-content-center"><Col xs={12} lg={9} xl={8}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Subscriptions</h1>
        <Button variant="success" disabled={loading || Boolean(error)} onClick={() => setEditor({ subscription: null })}><i className="bi bi-plus-lg me-2" aria-hidden="true" />Add subscription</Button>
      </div>
      <p className="text-secondary">Manage your recurring payments.</p>
      {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}
      {loading && <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading subscriptions…</p>}
      {error && <Alert variant="danger" role="alert">{error} <Button variant="outline-danger" size="sm" onClick={reload}>Retry</Button></Alert>}
      {!loading && !error && (subscriptions.length === 0 ? <div className="text-center py-5">
        <i className="bi bi-arrow-repeat display-5 text-secondary" aria-hidden="true" />
        <h2 className="h5 mt-3">No subscriptions yet</h2>
        <p className="text-secondary">Add a subscription to keep track of its next payment.</p>
        <Button variant="success" onClick={() => setEditor({ subscription: null })}>Add your first subscription</Button>
      </div> : <>
        <p className="small text-secondary">{subscriptions.filter((subscription) => subscription.active).length} active · {subscriptions.filter((subscription) => !subscription.active).length} inactive</p>
        <ul className="list-unstyled d-grid gap-3">{subscriptions.map((subscription) => <li key={subscription.id}>
          <Card as="article" aria-labelledby={`subscription-${subscription.id}`}><Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div><h2 id={`subscription-${subscription.id}`} className="h6 text-break">{subscription.name}</h2><Badge bg={subscription.active ? "success" : "secondary"}>{subscription.active ? "Active" : "Inactive"}</Badge></div>
              <div className="text-end"><strong>{amountFormat.format(subscription.amount)}</strong><div className="small text-secondary">{frequencies[subscription.frequency]}</div></div>
            </div>
            <p className="small text-secondary text-break mt-3 mb-1"><i className="bi bi-wallet2 me-1" aria-hidden="true" />{subscription.fundingSourceName} · {subscription.categoryName}</p>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span className="small text-secondary">{subscription.active ? "Next payment" : "Saved payment date"}: <time dateTime={subscription.nextPaymentDate}>{displayDate(subscription.nextPaymentDate)}</time></span>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <Button variant="outline-secondary" aria-label={`Edit ${subscription.name}`} onClick={() => setEditor({ subscription })}>Edit</Button>
                <Button variant={subscription.active ? "outline-danger" : "outline-success"} aria-label={`${subscription.active ? "Deactivate" : "Reactivate"} ${subscription.name}`} onClick={() => { setChanging(subscription); setActionError(null); }}>{subscription.active ? "Deactivate" : "Reactivate"}</Button>
                <Button variant="outline-danger" aria-label={`Delete ${subscription.name}`} onClick={() => { setDeleting(subscription); setDeleteError(null); setDeleteConflict(false); }}>
                  <i className="bi bi-trash me-2" aria-hidden="true" />Delete
                </Button>
              </div>
            </div>
          </Card.Body></Card>
        </li>)}</ul>
      </>)}
    </Col></Row>
    {editor && <SubscriptionModal subscription={editor.subscription} onClose={() => setEditor(null)} onSaved={(saved) => {
      setNotice(`${saved.name} ${editor.subscription ? "updated" : "added"}.`);
      setEditor(null);
      reload();
    }} />}
    <Modal show={Boolean(deleting)} onHide={() => { if (!busy) setDeleting(null); }} centered backdrop={busy ? "static" : true} keyboard={!busy} aria-labelledby="delete-subscription-title">
      <Modal.Header closeButton={!busy}><Modal.Title id="delete-subscription-title" className="h5">Delete subscription?</Modal.Title></Modal.Header>
      <Modal.Body>
        <p className="text-break">Delete {deleting?.name}? This cannot be undone.</p>
        <p className="small text-secondary">Only subscriptions without payment history can be deleted. Deactivate a subscription to stop future payments and keep its history.</p>
        {deleteError && <Alert variant="danger" role="alert">{deleteError}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button>
        {deleteConflict && deleting?.active && <Button variant="outline-danger" disabled={busy} onClick={() => {
          setChanging(deleting);
          setDeleting(null);
          setActionError(null);
        }}>Deactivate instead</Button>}
        <Button variant="danger" disabled={busy || deleteConflict} onClick={remove}>{busy ? "Deleting…" : "Delete subscription"}</Button>
      </Modal.Footer>
    </Modal>
    <Modal show={Boolean(changing)} onHide={() => { if (!busy) setChanging(null); }} centered backdrop={busy ? "static" : true} keyboard={!busy} aria-labelledby="subscription-status-title">
      <Modal.Header closeButton={!busy}><Modal.Title id="subscription-status-title" className="h5">{changing?.active ? "Deactivate" : "Reactivate"} subscription?</Modal.Title></Modal.Header>
      <Modal.Body>
        <p className="text-break">{changing?.active ? `Deactivate ${changing.name}? This stops future recurring payments and keeps the subscription record.` : `Reactivate ${changing?.name ?? "this subscription"}? Recurring payments will resume from the saved next payment date.`}</p>
        {!changing?.active && changing && <p className="small text-secondary">Saved payment date: {displayDate(changing.nextPaymentDate)}. You can edit the date before reactivating.</p>}
        {actionError && <Alert variant="danger" role="alert">{actionError}</Alert>}
      </Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" disabled={busy} onClick={() => setChanging(null)}>Cancel</Button><Button variant={changing?.active ? "danger" : "success"} disabled={busy} onClick={changeStatus}>{busy ? "Saving…" : changing?.active ? "Deactivate subscription" : "Reactivate subscription"}</Button></Modal.Footer>
    </Modal>
  </Container>;
}
