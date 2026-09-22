import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Container, Navbar, Row } from "react-bootstrap";
import { authService } from "../services/authService";

export default function Dashboard() {
  const navigate = useNavigate();

  function signOut() {
    authService.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-vh-100 bg-light text-body">
      <Navbar as="header" className="bg-white border-bottom py-3">
        <Container className="gap-2 px-3 px-sm-4">
          <Navbar.Brand as="span" className="fw-bold m-0 text-wrap">Finance Tracker</Navbar.Brand>
          <Button variant="outline-secondary" className="py-2 px-3 flex-shrink-0" onClick={signOut}>Sign out</Button>
        </Container>
      </Navbar>
      <Container as="main" className="px-3 px-sm-4 py-4 py-md-5">
        <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-3 mb-4">
          <h1 className="h3 mb-0">Dashboard</h1>
          <span className="text-secondary">Overview</span>
        </div>
        <section aria-label="Financial summary">
          <Row xs={1} md={3} className="g-3 g-lg-4">
          {[
            { label: "Total balance", tone: "secondary" },
            { label: "Income", tone: "success" },
            { label: "Expenses", tone: "danger" },
          ].map(({ label, tone }) => (
            <Col key={label}>
              <Card className="h-100 rounded-2">
                <Card.Body className="p-3 p-sm-4">
                  <Card.Title as="h2" className={`fs-6 text-${tone}`}>{label}</Card.Title>
                  <p className="fs-2 my-2 my-sm-3" aria-label="Not available">&mdash;</p>
                  <span className="small text-secondary">No data available</span>
                </Card.Body>
              </Card>
            </Col>
          ))}
          </Row>
        </section>
        <section className="mt-4 mt-md-5 border-top pt-4" aria-labelledby="transactions-title">
          <h2 id="transactions-title" className="h5">Recent transactions</h2>
          <div className="text-center py-5 px-3">
            <img className="mb-4" src="/transactions-empty.svg" alt="" width="96" height="80" />
            <h3 className="h6">No transactions to display</h3>
            <p className="text-secondary">Your income and expenses will appear here.</p>
          </div>
        </section>
      </Container>
    </div>
  );
}
