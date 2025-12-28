import { createRoot } from "react-dom/client";
import * as React from "react";
import { useFormState } from "../.";
// import { useFormState } from '@andydowell/use-form-state';

type NewUser = {
  email: string;
  password: string;
  confirmPassword: string;
};

const useNewUserFormState = () => {
  const newUser = useFormState<NewUser>({
    email: {
      defaultValue: "@",
      helperText: "Your Email Address",
      required: { message: "Please enter your email address" },
      validation: {
        longerThanOneChar: {
          validator: value => value.length > 1,
          message: "Email address must be longer than 1 character",
        },
        ["has-add-sign"]: {
          validator: value => value.includes("@"),
          message: "Email address must contain '@'",
        },
      },
    },
    password: {
      defaultValue: "",
      helperText: "Your Password",
      required: { message: "Please enter your password" },
      validation: {
        longerThanOneChar: {
          validator: value => value.length > 1,
          message: "Password must be longer than 1 character",
        },
      },
    },
    confirmPassword: {
      defaultValue: "",
      helperText: "Confirm Your Password",
      required: { message: "Please enter your password again" },
      validation: {
        longerThanOneChar: {
          validator: value => value.length > 1,
          message: "Password must be longer than 1 character",
        },
        matchPassword: {
          validator: (value, state) => value === state.password.value,
          message: "Passwords do not match",
        },
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
    console.table(newUser.getValues({ format: "object" }));
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
            onChange={e => newUser.setMany({ email: e.target.value })}
          />
          {email.isValid ? "✔️" : "❌"}
          <p
            style={{
              margin: 0,
              color: email.error ? "red" : "grey",
              fontSize: "0.9rem",
            }}
          >
            {email.error?.type} <br />
            {email.error?.message || email.helperText} <br />
          </p>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="password">Password: </label>
          <input
            id="password"
            type="password"
            name="password"
            value={password.value}
            onChange={e => newUser.set("password", e.target.value)}
          />
          {password.isValid ? "✔️" : "❌"}
          <p
            style={{
              margin: 0,
              color: password.error ? "red" : "grey",
              fontSize: "0.9rem",
            }}
          >
            {password.error?.type} <br />
            {password.error?.message || password.helperText} <br />
          </p>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="confirmPassword">Confirm Password: </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={confirmPassword.value}
            onChange={e => newUser.set("confirmPassword", e.target.value)}
          />
          {confirmPassword.isValid ? "✔️" : "❌"}
          <p
            style={{
              margin: 0,
              color: confirmPassword.error ? "red" : "grey",
              fontSize: "0.9rem",
            }}
          >
            {confirmPassword.error?.type} <br />
            {confirmPassword.error?.message || confirmPassword.helperText} <br />
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

const domNode = document.getElementById("root")!;
const root = createRoot(domNode);
root.render(<Form />);
