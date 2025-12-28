type FormFieldState<Value = any> = {
  label: string;
  value: Value;
  isValid: boolean;
  isInteracted: boolean;
  isRequired: boolean;
  helperText?: string;
  error?: {
    type?: string;
    message?: string;
  };
};

type FormState<Data> = {
  [Key in keyof Data]: FormFieldState<Data[Key]>;
};

type ValidationParams<Value, Data> = {
  [key: string]: {
    validator: (value: Value, formState: FormState<Data>) => boolean;
    message?: string;
    order?: number;
  };
};

type FormFieldParams<Data> = {
  [Key in keyof Data]: {
    defaultValue: Data[Key];
    required?: { message: string };
    validation?: ValidationParams<Data[Key], Data>;
    label?: string;
    helperText?: string;
  };
};

type FormStateOptions = {
  errorUpdateDelayInSeconds?: number;
  reinitializeDependencies?: any[];
};

export { FormFieldState, FormState, ValidationParams, FormFieldParams, FormStateOptions };
