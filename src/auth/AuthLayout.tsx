import type { ReactNode } from "react";
import { Col, Container, Row } from "react-bootstrap";

export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container fluid className="min-vh-100 bg-light px-3 py-4 py-sm-5">
      <Row className="justify-content-center g-0">
        <Col as="main" xs={12} sm={9} md={7} lg={5} xl={4} xxl={3}>
          <header className="mb-4">
            <p className="text-success fw-semibold mb-2">Finance Tracker</p>
            <h1 className="h3 mb-0">{title}</h1>
          </header>
          {children}
        </Col>
      </Row>
    </Container>
  );
}
