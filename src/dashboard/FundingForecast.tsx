import { loadFundingSourceOrder, orderFundingSources, saveFundingSourceOrder } from "./fundingSourceOrder";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import { dashboardService, type Forecast, type ForecastHorizon } from "../services/dashboardService";
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

  const [horizon, setHorizon] = useState<ForecastHorizon>("NEXT_MONTH");
  const [attempt, setAttempt] = useState(0);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState(false);
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });

  useEffect(() => {
    const controller = new AbortController();
    dashboardService.getForecast(horizon, controller.signal).then((result) => {
      if (!controller.signal.aborted) setForecast(result);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [horizon, attempt]);

  return <section className="mt-4 mt-md-5" aria-labelledby="accounts-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
      <div className="d-flex align-items-center gap-2">
        <h2 id="accounts-title" className="h5 mb-0">Funding sources</h2>
        <Badge bg="secondary" pill>{sources.length}</Badge>
      </div>
      <Form.Group controlId="forecast-horizon" className="d-flex align-items-center gap-2">
        <Form.Label className="small mb-0 text-nowrap">Predict through</Form.Label>
        <Form.Select size="sm" value={horizon} onChange={(event) => {
          setForecast(null); setError(false); setHorizon(event.target.value as ForecastHorizon);
        }}>
          <option value="THIS_MONTH">End of this month</option>
          <option value="NEXT_MONTH">End of next month</option>
        </Form.Select>
      </Form.Group>
    </div>
    <p className="small text-secondary mb-2">Predicted money left includes unpaid scheduled expenses and active subscriptions through the selected date. Future income is not included.</p>
    {forecast && <p className="small text-secondary">As of {displayDate(forecast.asOf)} · Through {displayDate(forecast.through)} · Independent of the spending year above.</p>}
    {error && <Alert variant="warning">Predictions are currently unavailable. Your current balances are shown below. <Button variant="outline-secondary" size="sm" onClick={() => { setError(false); setForecast(null); setAttempt((value) => value + 1); }}>Retry prediction</Button></Alert>}
    {!forecast && !error && <p className="small text-secondary" role="status">Loading predictions…</p>}
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
                    <span className="small text-secondary">Predicted money left</span>
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
