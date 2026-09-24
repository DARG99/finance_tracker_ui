import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, Col, Container, Form, Navbar, Row, Spinner } from "react-bootstrap";
import { authService } from "../services/authService";
import type { DashboardData } from "./dashboardData";
import { dashboardService } from "../services/dashboardService";
import { getApiErrorMessage } from "../api/errors";
import "./Dashboard.css";
import { monthTransactionsUrl } from "../transactions/dates";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const categoryColors = ["#198754", "#526ac7", "#b36b12", "#8b5bb5", "#16808a"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [yearInput, setYearInput] = useState(String(year));

  function changeYear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(yearInput);
    if (event.currentTarget.checkValidity() && Number.isInteger(value) && value >= 1 && value <= 9999) setYear(value);
  }

  function signOut() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-page bg-light text-body">
      <Navbar as="header" className="bg-white border-bottom py-3">
        <Container className="gap-2 px-3 px-sm-4">
          <Navbar.Brand as="span" className="fw-bold m-0 text-wrap">Finance Tracker</Navbar.Brand>
          <div className="d-flex align-items-center gap-2">
            <Link to="/profile" className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center" style={{ minWidth: 44, minHeight: 44 }} aria-label="Profile" title="Profile">
              <i className="bi bi-person-circle fs-5" aria-hidden="true" />
            </Link>
            <Button variant="outline-secondary" className="py-2 px-3 flex-shrink-0" onClick={signOut}>Sign out</Button>
          </div>
        </Container>
      </Navbar>
      <Container as="main" className="px-3 px-sm-4 py-4 py-md-5">
        <header className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <div>
            <h1 className="h3 mb-1">Dashboard</h1>
            <p className="text-secondary mb-0">Your money at a glance.</p>
          </div>
          <Form onSubmit={changeYear} className="d-flex align-items-end gap-2">
            <Form.Group controlId="dashboard-year">
              <Form.Label className="small mb-1">Spending year</Form.Label>
              <Form.Control type="number" min="1" max="9999" step="1" required value={yearInput} onChange={(event) => setYearInput(event.target.value)} style={{ width: "7rem" }} />
            </Form.Group>
            <Button type="submit" variant="outline-success" disabled={Number(yearInput) === year}>Apply</Button>
          </Form>
        </header>

        <DashboardReport key={year} year={year} />
      </Container>
    </div>
  );
}

function DashboardReport({ year }: { year: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    dashboardService.getOverview(year, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(error, "Unable to load your dashboard. Please try again."));
      });
    return () => controller.abort();
  }, [year, attempt]);

  if (error) return <Alert variant="danger" role="alert">
    {error} <Button variant="outline-danger" size="sm" onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Retry</Button>
  </Alert>;
  if (!data) return <p role="status"><Spinner as="span" size="sm" className="me-2" aria-hidden="true" />Loading dashboard…</p>;
  return <DashboardOverview data={data} year={year} />;
}

function DashboardOverview({ data, year, currency = "EUR" }: { data: DashboardData; year: number; currency?: string }) {
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const compactMoney = new Intl.NumberFormat(undefined, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
  const monthly = [...data.monthlySpending].sort((a, b) => a.month - b.month);
  const monthlyMax = Math.max(1, ...monthly.map((item) => item.amount));
  const categoryMax = Math.max(1, ...data.spendingByCategory.map((item) => item.amount));
  const summary = [
    { label: "Income", amount: data.allTimeIncome, hint: "All time", tone: "success", icon: "arrow-down-left" },
    { label: "Expenses", amount: data.allTimeExpense, hint: "All time", tone: "danger", icon: "arrow-up-right" },
    { label: "Current money", amount: data.currentTrackedMoney, hint: "Tracked account balances", tone: data.currentTrackedMoney < 0 ? "danger" : "success", icon: "wallet2" },
  ];

  return <>
        <section aria-label="Financial summary">
          <Row xs={3} className="g-2 g-sm-3 dashboard-summary">
            {summary.map((item) => <Col key={item.label}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="dashboard-summary-body">
                  <div className="dashboard-summary-heading">
                    <i className={`bi bi-${item.icon} text-${item.tone}`} aria-hidden="true" />
                    <h2 className="dashboard-summary-label mb-0">{item.label}</h2>
                  </div>
                  <p className={`dashboard-total fw-semibold text-${item.tone} mb-2`}>{money.format(item.amount)}</p>
                  <p className="dashboard-summary-hint text-secondary mb-0">{item.hint}</p>
                </Card.Body>
              </Card>
            </Col>)}
          </Row>
        </section>

        <Row className="g-3 g-lg-4 mt-1 mt-md-2">
          <Col xs={12} lg={7}>
            <Card as="section" className="h-100 border-0 shadow-sm" aria-labelledby="monthly-title">
              <Card.Body className="p-3 p-md-4">
                <h2 id="monthly-title" className="h5 mb-1">Monthly spending</h2>
                <p className="small text-secondary mb-4">Expenses by month · {year}. Select a bar to view all transactions that month.</p>
                {monthly.length === 0 ? <p className="text-secondary py-5 text-center">No monthly spending available.</p> : <>
                  <div className="dashboard-chart d-flex gap-2">
                    <div className="dashboard-axis small text-secondary">
                      <span>{compactMoney.format(monthlyMax)}</span>
                      <span>{compactMoney.format(monthlyMax / 2)}</span>
                      <span>{money.format(0)}</span>
                    </div>
                    <div className="dashboard-plot" style={{ gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))` }}>
                      {monthly.map((item) => <Link className="dashboard-month" key={item.month} to={monthTransactionsUrl(year, item.month)} aria-label={`View all transactions for ${months[item.month - 1]} ${year}. Spending: ${money.format(item.amount)}`} title={`View transactions for ${months[item.month - 1]} ${year}`}>
                        <div className="dashboard-bar-space">
                          <div className="dashboard-month-bar" style={{ height: `${item.amount / monthlyMax * 100}%` }} />
                        </div>
                        <span className="small text-secondary mt-2">{months[item.month - 1]}</span>
                      </Link>)}
                    </div>
                  </div>
                  <details className="small mt-3">
                    <summary className="text-secondary">View monthly amounts</summary>
                    <table className="table table-sm mt-2 mb-0">
                      <caption className="visually-hidden">Monthly spending amounts</caption>
                      <thead><tr><th scope="col">Month</th><th scope="col" className="text-end">Amount</th></tr></thead>
                      <tbody>{monthly.map((item) => <tr key={item.month}><th scope="row" className="fw-normal">{months[item.month - 1]}</th><td className="text-end">{money.format(item.amount)}</td></tr>)}</tbody>
                    </table>
                  </details>
                </>}
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} lg={5}>
            <Card as="section" className="h-100 border-0 shadow-sm" aria-labelledby="category-title">
              <Card.Body className="p-3 p-md-4">
                <h2 id="category-title" className="h5 mb-1">Spending by category</h2>
                <p className="small text-secondary mb-4">Spending breakdown · {year}</p>
                {data.spendingByCategory.length === 0 ? <p className="text-secondary py-5 text-center">No category spending available.</p> :
                  <ul className="list-unstyled d-grid gap-4 mb-0">
                    {data.spendingByCategory.map((item, index) => <li key={item.categoryId}>
                      <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                        <span className="text-break">{item.categoryName}</span>
                        <span className="fw-semibold">{money.format(item.amount)}</span>
                      </div>
                      <div className="dashboard-category-track" aria-hidden="true">
                        <div className="h-100 rounded-pill" style={{ width: `${item.amount / categoryMax * 100}%`, backgroundColor: categoryColors[index % categoryColors.length] }} />
                      </div>
                    </li>)}
                  </ul>}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <section className="mt-4 mt-md-5" aria-labelledby="accounts-title">
          <div className="d-flex align-items-center gap-2 mb-3">
            <h2 id="accounts-title" className="h5 mb-0">Funding sources</h2>
            <Badge bg="secondary" pill>{data.fundingSources.length}</Badge>
          </div>
          {data.fundingSources.length === 0 ? <p className="text-secondary">No funding sources available.</p> :
            <Row xs={1} md={3} className="g-3">
              {data.fundingSources.map((source) => <Col key={source.id}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="p-3 p-md-4 d-flex gap-3 align-items-center">
                    <span className="dashboard-account-icon bg-success-subtle text-success rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0">
                      <i className="bi bi-wallet2 fs-4" aria-hidden="true" />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="h6 text-break mb-1">{source.name}</h3>
                      <p className={`fs-4 fw-semibold text-break mb-0${source.balance < 0 ? " text-danger" : ""}`}>{money.format(source.balance)}</p>
                      <span className="small text-secondary">Current balance</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>)}
            </Row>}
        </section>
  </>;
}
