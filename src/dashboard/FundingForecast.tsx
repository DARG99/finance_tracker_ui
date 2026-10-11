import PaydayPicker from "./PaydayPicker";
import axios from "axios";
import { getApiErrorMessage } from "../api/errors";
import { loadFundingSourceOrder, orderFundingSources, saveFundingSourceOrder } from "./fundingSourceOrder";
import { useEffect, useState, type SubmitEvent } from "react";
import { Alert, Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import { dashboardService, type Forecast } from "../services/dashboardService";
import type { DashboardData } from "./dashboardData";
import { displayDate } from "../transactions/dates";

export default function FundingForecast({ sources, currency }: { sources: DashboardData["fundingSources"]; currency: string }) {
  const [order, setOrder] = useState(loadFundingSourceOrder);
  const [orderError, setOrderError] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const orderedSources = orderFundingSources(sources, order);

  function moveSource(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderedSources.length) return;
    const ids = orderedSources.map((source) => source.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setOrder(ids);
    const saved = saveFundingSourceOrder(ids);
    setOrderError(!saved);
    setOrderNotice(`${orderedSources[index].name} moved to position ${target + 1} of ${ids.length}.${saved ? " Order saved." : ""}`);
  }

  const [payday, setPayday] = useState<number | null>(null);
  const [paydayInput, setPaydayInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const day = Number(paydayInput);
  const validDay = Number.isInteger(day) && day >= 1 && day <= 31;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const setting = await dashboardService.getPayday(controller.signal);
        if (controller.signal.aborted) return;
        setPayday(setting.paydayDay);
        setPaydayInput(setting.paydayDay === null ? "" : String(setting.paydayDay));
        if (setting.paydayDay !== null) {
          const result = await dashboardService.getForecast(controller.signal);
          if (!controller.signal.aborted) setForecast(result);
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          setPayday(null);
          setPaydayInput("");
        }
        setError(getApiErrorMessage(error, "Unable to load your payday prediction. Please try again."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  function reloadPrediction() {
    setError(null);
    setForecast(null);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  async function savePayday(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !validDay || day === payday) return;
    setSaving(true);
    setSaveError(null);
    try {
      const setting = await dashboardService.setPayday(day);
      setPayday(setting.paydayDay);
      setPaydayInput(String(setting.paydayDay));
      reloadPrediction();
    } catch (error: unknown) {
      setSaveError(getApiErrorMessage(error, "Unable to save your payday. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-4 mt-md-5" aria-labelledby="accounts-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
      <div className="d-flex align-items-center gap-2">
        <h2 id="accounts-title" className="h5 mb-0">Funding sources</h2>
        <Badge bg="secondary" pill>{sources.length}</Badge>
      </div>
    </div>
    <Form onSubmit={savePayday} className="payday-form d-flex flex-wrap align-items-end gap-2 mb-2" aria-busy={saving}>
      <Form.Group controlId="forecast-payday">
        <Form.Label className="small mb-1">{payday === null ? "Set your monthly payday" : "Monthly payday"}</Form.Label>
        <PaydayPicker value={paydayInput} disabled={saving || loading}
          onChange={(value) => { setPaydayInput(value); setSaveError(null); }} />
      </Form.Group>
      <Button type="submit" variant="outline-success" disabled={saving || loading || !validDay || day === payday}>{saving ? "Saving…" : "Save payday"}</Button>
    </Form>
    <p id="payday-help" className="small text-secondary">Choose your usual payday, from 1 to 31. In shorter months, it falls on the last day. Early or late salary payments do not change this date.</p>
    {saveError && <Alert variant="danger" role="alert">{saveError}</Alert>}
    <p className="small text-secondary mb-2">Money left before payday subtracts unpaid scheduled expenses and active subscriptions from your current balance. Future salary is not included.</p>
    {forecast && <p className="small text-secondary">As of {displayDate(forecast.asOf)} · Covers costs through {displayDate(forecast.through)} (inclusive).</p>}
    {error && <Alert variant="warning">{error} <Button variant="outline-secondary" size="sm" disabled={saving || loading} onClick={reloadPrediction}>Retry prediction</Button></Alert>}
    {loading && <p className="small text-secondary" role="status">Loading payday prediction…</p>}
    {!loading && !error && payday === null && <p className="small text-secondary" role="status">Save your payday to see how much money will be left before your next salary.</p>}
    <span className="visually-hidden" role="status">{orderNotice}</span>
    {orderError && <Alert variant="warning">Your cards have been reordered, but the order could not be saved on this device. <Button size="sm" variant="outline-secondary" onClick={() => {
      const saved = saveFundingSourceOrder(orderedSources.map((source) => source.id));
      setOrderError(!saved);
      if (saved) setOrderNotice("Order saved.");
    }}>Retry saving</Button></Alert>}
    {sources.length === 0 ? <p className="text-secondary">No funding sources available.</p> :
      <Row xs={1} md={2} xl={3} className="g-3">
        {orderedSources.map((source, index) => {
          const prediction = forecast?.fundingSources.find((item) => item.id === source.id);
          return <Col key={source.id}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="p-3 p-md-4">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                  <h3 className="h6 text-break mb-0"><i className="bi bi-wallet2 text-success me-2" aria-hidden="true" />{source.name}</h3>
                  {orderedSources.length > 1 && <div className="d-flex gap-1 flex-shrink-0" role="group" aria-label={`Reorder ${source.name}`}>
                    <Button size="sm" variant="outline-secondary" style={{ minWidth: 44, minHeight: 44 }} disabled={index === 0} aria-label={`Move ${source.name} up`} title="Move up" onClick={() => moveSource(index, -1)}>
                      <i className="bi bi-arrow-up" aria-hidden="true" />
                    </Button>
                    <Button size="sm" variant="outline-secondary" style={{ minWidth: 44, minHeight: 44 }} disabled={index === orderedSources.length - 1} aria-label={`Move ${source.name} down`} title="Move down" onClick={() => moveSource(index, 1)}>
                      <i className="bi bi-arrow-down" aria-hidden="true" />
                    </Button>
                  </div>}
                </div>
                <div className="dashboard-balances">
                  <div>
                    <p className={`fs-4 fw-semibold text-break mb-0${source.balance < 0 ? " text-danger" : ""}`}>{money.format(source.balance)}</p>
                    <span className="small text-secondary">Current balance</span>
                  </div>
                  <div className="text-end border-start ps-3">
                    <p className={`fs-5 fw-semibold text-break mb-0 ${prediction && prediction.predictedBalance < 0 ? "text-danger" : "text-primary"}`}>{prediction ? money.format(prediction.predictedBalance) : "—"}</p>
                    <span className="small text-secondary">Money left before payday</span>
                  </div>
                </div>
                {forecast && !prediction && <p className="small text-secondary mt-3 mb-0">Prediction unavailable for this source.</p>}
                {prediction && <details className="small mt-3">
                  <summary className="text-secondary">Upcoming costs · {money.format(prediction.scheduledExpenses + prediction.subscriptionExpenses)}</summary>
                  <dl className="mt-2 mb-0">
                    <div className="d-flex justify-content-between gap-2"><dt className="fw-normal">Scheduled expenses</dt><dd>{money.format(prediction.scheduledExpenses)}</dd></div>
                    <div className="d-flex justify-content-between gap-2"><dt className="fw-normal">Subscriptions</dt><dd>{money.format(prediction.subscriptionExpenses)}</dd></div>
                  </dl>
                  {prediction.predictedBalance < 0 && <p className="text-danger mb-0">Planned costs exceed the available balance.</p>}
                </details>}
              </Card.Body>
            </Card>
          </Col>;
        })}
      </Row>}
  </section>;
}
