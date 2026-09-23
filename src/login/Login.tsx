import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../auth/AuthLayout";
import { getApiErrorMessage } from "../api/errors";
import { authService } from "../services/authService";
import { loginSchema, type LoginFormData } from "../schemas/loginSchema";

export default function Login() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await authService.login(data);
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, "Unable to log in. Check your details and try again."));
    }
  }

  return (
    <AuthLayout title="Log in">
      <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
        {serverError && <Alert variant="danger" role="alert">{serverError}</Alert>}
        <fieldset disabled={isSubmitting}>
          <Form.Group controlId="login-email" className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              size="lg"
              className="fs-6 py-3"
              isInvalid={Boolean(errors.email)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            <Form.Control.Feedback type="invalid" id="login-email-error">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="login-password" className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              size="lg"
              className="fs-6 py-3"
              isInvalid={Boolean(errors.password)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            <Form.Control.Feedback type="invalid" id="login-password-error">
              {errors.password?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Button type="submit" variant="success" size="lg" className="w-100 mt-2 fs-6 py-3" disabled={isSubmitting}>
            {isSubmitting && <Spinner as="span" size="sm" className="me-2" aria-hidden="true" />}
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </fieldset>
      </Form>
      <div className="mt-4 pt-3 border-top text-center">
        <p className="text-secondary mb-2">Don't have an account?</p>
        <Link to="/" className="btn btn-outline-secondary w-100 py-3">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
