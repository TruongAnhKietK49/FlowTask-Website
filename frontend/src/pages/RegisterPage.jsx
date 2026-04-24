import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function RegisterPage() {
  const { register, token } = useAuth();
  const [formValues, setFormValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(formValues);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div>
          <p className="eyebrow">Start strong</p>
          <h1>Create your FlowTask account</h1>
          <p className="auth-copy">Create workspaces, share projects with teammates, and keep the existing JWT auth flow.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" onChange={handleChange} required value={formValues.name} />
          </label>

          <label>
            Email
            <input name="email" onChange={handleChange} required type="email" value={formValues.email} />
          </label>

          <label>
            Password
            <input
              minLength="8"
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={formValues.password}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
