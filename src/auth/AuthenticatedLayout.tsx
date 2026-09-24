import { Container } from "react-bootstrap";
import { NavLink, Outlet } from "react-router-dom";

export default function AuthenticatedLayout() {
  return (
    <div className="bg-light min-vh-100" style={{ paddingBottom: "calc(4.5rem + 1px + env(safe-area-inset-bottom, 0px))" }}>
      <Outlet />
      <footer className="fixed-bottom bg-white border-top shadow-sm" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
        <Container as="nav" aria-label="Main navigation" className="d-flex gap-2 py-2 px-3" style={{ maxWidth: "720px", height: "4rem" }}>
          <NavLink to="/dashboard" end className={({ isActive }) =>
            `btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 ${isActive ? "btn-success" : "btn-light text-secondary"}`
          }>
            <i className="bi bi-house fs-4 lh-1" aria-hidden="true" />
            <span className="small d-none d-sm-inline">Dashboard</span>
            <span className="visually-hidden d-sm-none">Dashboard</span>
          </NavLink>
          <NavLink to="/transactions" end className={({ isActive }) =>
            `btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 ${isActive ? "btn-success" : "btn-light text-secondary"}`
          }>
            <i className="bi bi-list-ul fs-4 lh-1" aria-hidden="true" />
            <span className="small d-none d-sm-inline">Transactions</span>
            <span className="visually-hidden d-sm-none">Transactions</span>
          </NavLink>
          <NavLink to="/subscriptions" className={({ isActive }) =>
            `btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 ${isActive ? "btn-success" : "btn-light text-secondary"}`
          }>
            <i className="bi bi-arrow-repeat fs-4 lh-1" aria-hidden="true" />
            <span className="small d-none d-sm-inline">Subscriptions</span>
            <span className="visually-hidden d-sm-none">Subscriptions</span>
          </NavLink>
          <NavLink to="/transactions/new" className={({ isActive }) =>
            `btn flex-fill d-flex align-items-center justify-content-center gap-2 py-2 ${isActive ? "btn-success" : "btn-light text-secondary"}`
          }>
            <i className="bi bi-plus-lg fs-4 lh-1" aria-hidden="true" />
            <span className="small d-none d-sm-inline">Add transaction</span>
            <span className="visually-hidden d-sm-none">Add transaction</span>
          </NavLink>
        </Container>
      </footer>
    </div>
  );
}
