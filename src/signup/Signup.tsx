import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../auth/AuthLayout";
import { getApiErrorMessage } from "../api/errors";
import { authService } from "../services/authService";
import { signupSchema, type SignupFormData } from "../schemas/signupSchema";

export default function Signup() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormData) {
    setServerError(null);
    try {
      await authService.signup(data);
      navigate("/login");
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, "Registration failed. Please try again."));
    }
  }

  return (
    <AuthLayout title="Create an account">
      <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
        {serverError && <Alert variant="danger" role="alert">{serverError}</Alert>}
        <fieldset disabled={isSubmitting}>
          <Form.Group controlId="signup-name" className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              autoComplete="name"
              size="lg"
              className="fs-6 py-3"
              isInvalid={Boolean(errors.name)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "signup-name-error" : undefined}
              {...register("name")}
            />
            <Form.Control.Feedback type="invalid" id="signup-name-error">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="signup-email" className="mb-3">
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
              aria-describedby={errors.email ? "signup-email-error" : undefined}
              {...register("email")}
            />
            <Form.Control.Feedback type="invalid" id="signup-email-error">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="signup-password" className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              size="lg"
              className="fs-6 py-3"
              isInvalid={Boolean(errors.password)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "signup-password-error" : undefined}
              {...register("password")}
            />
            <Form.Control.Feedback type="invalid" id="signup-password-error">
              {errors.password?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <Button type="submit" variant="success" size="lg" className="w-100 mt-2 fs-6 py-3" disabled={isSubmitting}>
            {isSubmitting && <Spinner as="span" size="sm" className="me-2" aria-hidden="true" />}
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </fieldset>
      </Form>
      <div className="mt-4 pt-3 border-top text-center">
        <p className="text-secondary mb-2">Already have an account?</p>
        <Link to="/login" className="btn btn-outline-secondary w-100 py-3">
          Log in
        </Link>
      </div>
    </AuthLayout>
  );
}
