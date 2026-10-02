import { useEffect, useState } from "react";
import { Alert, Button, Container, Spinner } from "react-bootstrap";
import { Navigate, Outlet } from "react-router-dom";
import { renewSession } from "./renewal";
import { useSession } from "./useSession";

export default function RequireAuth() {
  const signedIn = useSession();
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    const renew = () => {
      void renewSession().then(() => {
        if (active) setStatus("ready");
      }).catch(() => {
        if (active) setStatus("error");
      });
    };
    const onVisible = () => { if (document.visibilityState === "visible") renew(); };
    renew();
    const timer = window.setInterval(renew, 30000);
    window.addEventListener("online", renew);
    window.addEventListener("focus", renew);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", renew);
      window.removeEventListener("focus", renew);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn, attempt]);

  if (!signedIn) return <Navigate to="/login" replace />;
  if (status === "checking") return <Container className="py-4"><p role="status"><Spinner size="sm" className="me-2" />Restoring your session…</p></Container>;
  if (status === "error") return <Container className="py-4"><Alert variant="warning">
    Unable to renew your session. Check your connection and try again.
    <Button className="ms-2" variant="outline-dark" onClick={() => { setStatus("checking"); setAttempt((value) => value + 1); }}>Retry</Button>
  </Alert></Container>;
  return <Outlet />;
}
