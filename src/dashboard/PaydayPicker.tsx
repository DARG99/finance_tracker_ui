import { useState } from "react";
import { Button, Modal } from "react-bootstrap";

export default function PaydayPicker({ value, disabled, onChange }: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button id="forecast-payday" type="button" variant="outline-secondary" className="w-100 text-start py-2"
      style={{ minHeight: 44 }} disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
      aria-describedby="payday-help" onClick={() => setOpen(true)}>
      <i className="bi bi-calendar3 me-2" aria-hidden="true" />
      {value ? `Day ${value} of every month` : "Choose payday"}
    </Button>
    <Modal show={open} onHide={() => setOpen(false)} centered aria-labelledby="payday-picker-title">
      <Modal.Header closeButton>
        <Modal.Title id="payday-picker-title" className="h5">Choose your monthly payday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-secondary">Tap the day you usually get paid. In shorter months, days 29–31 fall on the last day.</p>
        <div className="payday-calendar" role="group" aria-label="Day of the month">
          {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) =>
            <Button key={day} type="button" variant={value === day ? "success" : "outline-secondary"}
              aria-label={`Day ${day}`} aria-pressed={value === day} disabled={disabled}
              onClick={() => { onChange(day); setOpen(false); }}>{day}</Button>)}
        </div>
      </Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" onClick={() => setOpen(false)}>Cancel</Button></Modal.Footer>
    </Modal>
  </>;
}
