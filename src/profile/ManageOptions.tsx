import { useEffect, useState, type SubmitEvent } from "react";
import axios from "axios";
import { Alert, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import { getApiErrorMessage } from "../api/errors";
import { profileService } from "../services/profileService";
import { transactionService, type TransactionOption } from "../services/transactionService";

const optionKinds = {
  "funding-source": {
    title: "Funding sources", label: "funding source", plural: "funding sources",
    help: "A funding source can be deleted when its balance is zero and no transactions use it.",
    conflict: "Cannot delete this funding source. Its balance must be zero and it must not be used by transactions.",
    load: transactionService.getFundingSources,
    remove: profileService.deleteFundingSource,
  },
  category: {
    title: "Categories", label: "category", plural: "categories",
    help: "A category can be deleted when no transactions use it.",
    conflict: "Cannot delete a category that is used by transactions.",
    load: transactionService.getCategories,
    remove: profileService.deleteCategory,
  },
};

export default function ManageOptions({ kind }: { kind: keyof typeof optionKinds }) {
  const config = optionKinds[kind];
  const [sources, setSources] = useState<TransactionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [renaming, setRenaming] = useState<TransactionOption | null>(null);
  const [name, setName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TransactionOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    config.load(controller.signal).then((result) => {
      if (!controller.signal.aborted) setSources(result);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(getApiErrorMessage(error, `Unable to load ${config.plural}. Please try again.`));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt, config]);

  function reload() {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }

  async function rename(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming || busy || !name.trim() || name.trim() === renaming.name.trim()) return;
    setBusy(true);
    setRenameError(null);
    try {
      const updated = await profileService.renameCategory(renaming.id, name);
      setSources((current) => current.map((source) => source.id === updated.id ? updated : source));
      setNotice(`Category renamed to ${updated.name}.`);
      setRenaming(null);
    } catch (error: unknown) {
      setRenameError(getApiErrorMessage(error, "Unable to rename the category. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await config.remove(deleting.id);
      setNotice(`${deleting.name} deleted.`);
      setDeleting(null);
      reload();
    } catch (error: unknown) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      setDeleteError(getApiErrorMessage(error, conflict
        ? config.conflict
        : `Unable to delete the ${config.label}. Please try again.`));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Card as="section" className="mt-4 shadow-sm" aria-labelledby={`${kind}-list-title`}>
      <Card.Body className="p-3 p-sm-4">
        <h2 id={`${kind}-list-title`} className="h5">{config.title}</h2>
        <p className="small text-secondary">{config.help}</p>
        {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice(null)}>{notice}</Alert>}
        {loading && <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading {config.plural}…</p>}
        {error && <Alert variant="danger" role="alert">{error} <Button variant="outline-danger" size="sm" onClick={reload}>Retry</Button></Alert>}
        {!loading && !error && (sources.length === 0
          ? <p className="text-secondary mb-0">No {config.plural} yet. Add one above.</p>
          : <ul className="list-unstyled mb-0 d-grid gap-2">
            {sources.map((source) => <li key={source.id} className="d-flex align-items-center justify-content-between gap-3 border rounded p-2">
              <span className="text-break">{source.name}</span>
              <div className="d-flex flex-wrap justify-content-end gap-2 flex-shrink-0">
              {kind === "category" && <Button variant="outline-secondary" style={{ minHeight: 44 }} aria-label={`Rename ${source.name}`} onClick={() => {
                setRenaming(source); setName(source.name); setRenameError(null);
              }}>Rename</Button>}
              <Button variant="outline-danger" className="flex-shrink-0" style={{ minHeight: 44 }} aria-label={`Delete ${source.name}`} onClick={() => { setDeleting(source); setDeleteError(null); }}>
                <i className="bi bi-trash me-2" aria-hidden="true" />Delete
              </Button>
              </div>
            </li>)}
          </ul>)}
      </Card.Body>
    </Card>
    <Modal show={Boolean(renaming)} onHide={() => { if (!busy) setRenaming(null); }} centered backdrop={busy ? "static" : true} keyboard={!busy} aria-labelledby="rename-category-title">
      <Modal.Header closeButton={!busy}><Modal.Title id="rename-category-title" className="h5">Rename category</Modal.Title></Modal.Header>
      <Form onSubmit={rename} aria-busy={busy}>
        <Modal.Body>
          <Form.Group controlId="rename-category-name">
            <Form.Label>Name</Form.Label>
            <Form.Control autoFocus required value={name} disabled={busy} onChange={(event) => { setName(event.target.value); setRenameError(null); }} />
            <Form.Text>Linked transactions and subscriptions keep this category.</Form.Text>
          </Form.Group>
          {renameError && <Alert variant="danger" role="alert" className="mt-3 mb-0">{renameError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" disabled={busy} onClick={() => setRenaming(null)}>Cancel</Button>
          <Button type="submit" variant="success" disabled={busy || !name.trim() || name.trim() === renaming?.name.trim()}>{busy ? "Saving…" : "Save name"}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
    <Modal show={Boolean(deleting)} onHide={() => { if (!busy) setDeleting(null); }} centered backdrop={busy ? "static" : true} keyboard={!busy} aria-labelledby={`delete-${kind}-title`}>
      <Modal.Header closeButton={!busy}><Modal.Title id={`delete-${kind}-title`} className="h5">Delete {config.label}?</Modal.Title></Modal.Header>
      <Modal.Body>
        <p className="mb-0 text-break">Delete {deleting?.name}? This cannot be undone.</p>
        {deleteError && <Alert variant="danger" role="alert" className="mt-3 mb-0">{deleteError}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button>
        <Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Deleting…" : `Delete ${config.label}`}</Button>
      </Modal.Footer>
    </Modal>
  </>;
}
