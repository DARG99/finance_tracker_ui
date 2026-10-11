import { useId } from "react";
import { Form } from "react-bootstrap";
import { useTheme } from "./useTheme";

export default function ThemeSwitch() {
  const id = useId();
  const { theme, setTheme } = useTheme();
  return <div className="theme-switch d-flex flex-column align-items-center justify-content-center px-2 flex-shrink-0" title="Dark mode">
    <i className={`bi bi-${theme === "dark" ? "moon-stars" : "sun"}`} aria-hidden="true" />
    <Form.Check id={id} type="switch" className="mb-0" label={<span className="visually-hidden">Dark mode</span>}
      checked={theme === "dark"} onChange={(event) => setTheme(event.target.checked ? "dark" : "light")} />
  </div>;
}
