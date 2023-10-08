import { createRoot } from 'react-dom/client';
import * as React from 'react';
// import { useFormState } from '../.';
import { useFormState } from '@andydowell/use-form-state';

type NewUser = {
  email: string;
  password: string;
  confirmPassword: string;
};

const useNewUserFormState = () => {
  const newUser = useFormState<NewUser>({
    email: {
      defaultValue: '@',
      helperText: 'Your Email Address',
      isRequired: true,
      validator: (value: string) => {
        return value.length > 1 && value.includes('@');
      },
      errorMessage: {
        required: 'Please enter your email address',
        format: 'Email address is invalid',
      },
    },
    password: {
      defaultValue: '',
      helperText: 'Your Password',
      isRequired: true,
      validator: (value: string) => {
        return value.length > 1;
      },
      errorMessage: {
        required: 'Please enter your password',
      },
    },
    confirmPassword: {
      defaultValue: '',
      helperText: 'Confirm Your Password',
      isRequired: true,
      validator: (value: string) => {
        return value === newUser.state.password.value;
      },
      errorMessage: {
        required: 'Please enter your password again',
        format: 'Password does not match',
      },
    },
  });

  return newUser;
};

const Form = () => {
  const newUser = useNewUserFormState();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isValid = newUser.checkIfAllValid();
    if (!isValid) return;
    console.table(newUser.extractStateValue({ format: 'object' }));
  };

  const { email, password, confirmPassword } = newUser.state;

  return (
    <div style={{ padding: 24 }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="email">Email: </label>
          <input
            id="email"
            type="text"
            name="email"
            value={email.value}
            onChange={e => newUser.set('email', e.target.value)}
          />
          {email.isValid ? '✔️' : '❌'}
          <p
            style={{
              margin: 0,
              color: email.error ? 'red' : 'grey',
              fontSize: '0.9rem',
            }}
          >
            {email.error?.message || email.helperText}
          </p>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="password">Password: </label>
          <input
            id="password"
            type="password"
            name="password"
            value={password.value}
            onChange={e => newUser.set('password', e.target.value)}
          />
          {password.isValid ? '✔️' : '❌'}
          <p
            style={{
              margin: 0,
              color: password.error ? 'red' : 'grey',
              fontSize: '0.9rem',
            }}
          >
            {password.error?.message || password.helperText}
          </p>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="confirmPassword">Confirm Password: </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={confirmPassword.value}
            onChange={e => newUser.set('confirmPassword', e.target.value)}
          />
          {confirmPassword.isValid ? '✔️' : '❌'}
          <p
            style={{
              margin: 0,
              color: confirmPassword.error ? 'red' : 'grey',
              fontSize: '0.9rem',
            }}
          >
            {confirmPassword.error?.message || confirmPassword.helperText}
          </p>
        </div>
        <button type="submit" style={{ marginRight: 8 }}>
          Submit
        </button>
        <button type="reset" onClick={newUser.reset}>
          Reset
        </button>
      </form>
    </div>
  );
};

const domNode = document.getElementById('root')!;
const root = createRoot(domNode);
root.render(<Form />);
