import { useEffect, useState } from "react";
import { Badge, Button } from "react-bootstrap";
import type { Transaction } from "../schemas/transactionSchema";
import { transactionService } from "../services/transactionService";
import { displayDate } from "./dates";

export default function ReimbursementLabel({ transaction, onShowOriginal }: { transaction: Transaction; onShowOriginal: (id: number) => void }) {
  const [original, setOriginal] = useState<Transaction | null>(null);
  const id = transaction.reimbursementForTransactionId;
  const includedDate = transaction.reimbursementForTransactionDate;

  useEffect(() => {
    if (!id || includedDate) return;
    const controller = new AbortController();
    transactionService.getById(id, controller.signal).then((result) => {
      if (!controller.signal.aborted) setOriginal(result);
    }).catch(() => {
      // Keep the reimbursement visible even if its linked expense cannot be loaded.
    });
    return () => controller.abort();
  }, [id, includedDate]);

  const linked = original?.id === id ? original : null;
  const description = transaction.reimbursementForDescription || linked?.description;
  const date = includedDate || linked?.transactionDate;

  return <p className="small text-secondary text-break mt-2 mb-1">
    <Badge bg="info" text="dark"><i className="bi bi-arrow-return-left me-1" aria-hidden="true" />Reimbursement</Badge>
    {id ? <> for the{" "}
    <Button variant="link" className="p-0 align-baseline fw-semibold text-decoration-underline" style={{ fontSize: "inherit" }} onClick={() => onShowOriginal(id)}>original transaction</Button>
    {description && ` “${description}”`}
    {date ? <> on <time dateTime={date}>{displayDate(date)}</time></> : " · Original transaction date unavailable"}
    </> : " · No linked expense"}
  </p>;
}
