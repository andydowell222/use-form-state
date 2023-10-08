# FormState React Hook

The `useFormState` hook is a utility for managing form state in React applications. It provides functionality for tracking and validating form fields, as well as extracting form data in different formats. With `useFormState`, you can easily handle form interactions and ensure data integrity.

## Installation

To install the `use-form-state` package, run the following command:

```shell
npm install @andydowell/use-form-state
```

## Usage

Import the `useFormState` hook and other types from the package:

```javascript
import { useFormState, FormStateProps } from '@andydowell/use-form-state';
```

### Defining Form State Props

Before using the hook, you need to define the form state props. These props represent the structure of your form and include information such as default values, validation rules, and error messages.

```javascript
type MyFormData = {
  email: string,
  password: string,
};

const formStateProps: FormStateProps<MyFormData> = {
  email: {
    defaultValue: '@',
    helperText: 'Your Email Address',
    isRequired: true,
    validator: value => {
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
    validator: value => {
      return value.length > 1;
    },
    errorMessage: {
      required: 'Please enter your password',
    },
  },
};
```

Each field in the form state props is defined by a key-value pair, where the key is the name of the field and the value is an object with the following properties:

| Property     | Description                                                                                                                                                                                   | Type                                 | Example                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| defaultValue | The default value for the form field.                                                                                                                                                         |                                      | ""                                                                                |
| isRequired   | (Optional) Specifies whether the form field is required.                                                                                                                                      | boolean                              |
| validator    | (Optional) A function that validates the form field value. The first param is the input value, second param is the form state, which the value can be validated using other form field value. | (value, state) => boolean            | `(confirmPassword, state) => { return confirmPassword === state.password.value }` |
| helperText   | (Optional) Text that provides additional information or guidance for the form field.                                                                                                          | string                               | 'Please enter a valid email'                                                      |
| errorMessage | (Optional) An object that defines error messages for specific error types.                                                                                                                    | `{format: string, required: string}` | `{ format: 'Invalid format', required: 'This field is required' }`                |

### Initializing the Form State

Next, initialize the form state using the `useFormState` hook and the form state props:

```javascript
const { state, set, checkIfAllValid, extractStateValue, reset } = useFormState(
  formStateProps,
  options
);
```

The `options` parameter is an object with the following properties:
| Property | Type | Description |
| -------- | ---- | ----------- |
|errorUpdateDelayInSeconds| number | (Optional) Specifies the delay in seconds before the error type is updated. Default is `0.5`.|

The `state` object contains the current values and validation status of each form field. <br/>
The `set` function allows you to update the form field values. <br/>
The `checkIfAllValid` function checks if all fields are valid. <br/>
The `extractStateValue` function extracts the form data in the specified format. <br/>
The `reset` function resets the form to its initial state.

## `state`

Each form field in the `state` object is represented by an object with the following properties:

| Property       | Description                                                                                                                                                                                                      | Example Usage                                                                    | Example Output                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `value`        | The current value of the form field.                                                                                                                                                                             | `state.email.value`                                                              |
| `isValid`      | Indicates whether the value of the form field is valid. Required fields are considered valid if they are filled. If a validator is provided, the value will be validated against the validator function.         | `state.email.isValid`                                                            |
| `isInteracted` | Indicates whether the form field has been interacted with (user has changed the value).                                                                                                                          | `state.email.isInteracted`                                                       |
| `isRequired`   | Indicates whether the form field is required.                                                                                                                                                                    | `state.email.isRequired`                                                         |
| `helperText`   | A helper text that provides additional information or instructions for the form field.                                                                                                                           | `state.email.helperText`                                                         |
| `error`        | An object that represents an error associated with the form field. It has two properties: `type` (the type of error) and `message` (the error message). If there is no error, this property will be `undefined`. | `state.email.error`<br>`state.email.error?.type`<br>`state.email.error?.message` | `{ type: "required", message: "Please enter your email address" }` |

`error` is not updated immediately when the value of a form field changes. Instead, it is updated after a delay (default is 0.5 seconds) to prevent the error message from flashing when the user is typing. If the field is not interacted with, the error will not be updated. Running `checkIfAllValid({ updateErrorType: true })` will update all errors immediately.

### Updating Form Field Values

To update a form field value, use the `set` function:

```javascript
set(key, value, setInteracted);
```

Example:<br/>
To update the value of the `email` field:

```javascript
set('email', 'user@email.com');
```

| Parameter       | Type                      | Description                                                                               | Example                 |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| `key`           | string                    | The key of the field in the form state.                                                   | `'email'`               |
| `value`         | (type of the field value) | The new value to be set for the field.                                                    | `'example@example.com'` |
| `setInteracted` | boolean                   | (Optional) Indicates whether the field should be marked as interacted. Default is `true`. | `false`                 |

### Checking Form Field Validity

You can check the validity of individual form fields by accessing the `isValid` property in the `state` object:

```javascript
const isEmailValid = state.email.isValid;
```

### Checking Overall Form Validity

To check if the entire form is valid, use the `checkIfAllValid` function:

```javascript
const isFormValid = checkIfAllValid(options);
```

The `options` parameter is an object with the following properties:

| Parameter         | Type    | Description                                                                                      |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `updateErrorType` | boolean | (Optional) Specifies whether the error types of all fields should be updated. Default is `true`. |

The validation will check all form fields based on their defined rules and update their validation status and error messages accordingly.

### Extracting Form Data

You can extract the form data in different formats using the `extractStateValue` function. Currently, two formats are supported: `'object'` and `'formdata'`.

Example:<br/>
To extract the form data as an object:

```javascript
const dataObject = extractStateValue({ format: 'object' });
```

To extract the form data as FormData:

```javascript
const formData = extractStateValue({ format: 'formdata' });
```

### Resetting the Form

To reset the form to its initial state, use the `reset` function:

```javascript
reset();
```

This will clear all form field values and reset their validation status.

## Example

```javascript
const newUser = useFormState<RegisterUser>({
  email: {
    defaultValue: '',
    isRequired: true,
    validator: (value) => {
      return value.length > 0 && value.includes('@');
    },
    helperText: 'Please enter your email address',
    errorMessage: {
      required: 'Email address is required',
      format: 'Email address is invalid',
    },
  },
  password: {
    defaultValue: '',
    isRequired: true,
    validator: (value) => {
      return value.length > 0;
    },
    helperText: 'Please enter your password',
    errorMessage: {
      required: 'Password is required',
    },
  },
  confirmPassword: {
    defaultValue: '',
    isRequired: true,
    validator: (value, formState) => {
      return value === formState.password.value;
    },
    helperText: 'Please confirm your password',
    errorMessage: {
      required: 'Password is required',
      format: 'Password does not match',
    },
  },
});

const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!newUser.checkIfAllValid()) return;

  const formdata = newUser.extractStateValue({ format: 'formdata' });
  console.log(formdata.get('email'));
};

const { email, password, confirmPassword } = newUser.state;

// ---------------------------------

<form onSubmit={onSubmit}>
  <div>
    <Input
      value={email.value}
      onChange={e => newUser.set('email', e.target.value)}
    />
    <p>{email.error?.message || email.helperText}</p>
  </div>
  <div>
    <Input
      type="password"
      value={password.value}
      onChange={e => newUser.set('password', e.target.value)}
      error={Boolean(password.error)}
    />
    <p>{password.error?.message || password.helperText}</p>
  </div>
  <div>
    <Input
      type="password"
      value={confirmPassword.value}
      onChange={e => newUser.set('confirmPassword', e.target.value)}
      error={Boolean(confirmPassword.error)}
    />
    <p>{confirmPassword.error?.message || confirmPassword.helperText}</p>
  </div>
  <button type="submit">Submit</button>
  <button type="reset" onClick={newUser.reset}>
    Reset
  </button>
</form>;
```

## License

This package is open source and available under the [MIT License](https://opensource.org/licenses/MIT).
