import { useEffect, useRef, useState } from "react";

type ValidationParams<Value, Data> = {
  [key: string]: {
    validator: (value: Value, formState: FormState<Data>) => boolean;
    message?: string;
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

type FormState<Data> = {
  [Key in keyof Data]: FormFieldState<Data[Key]>;
};

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

// --------------------------------------------------------------------

const useFormState = <Data>(formFieldParams: FormFieldParams<Data>, options: FormStateOptions = {}) => {
  const { errorUpdateDelayInSeconds = 0.5, reinitializeDependencies = [] } = options;

  const initialFormState = (() => {
    const _state = {} as FormState<Data>;
    for (const key in formFieldParams) {
      _state[key] = {
        value: formFieldParams[key].defaultValue,
        label: formFieldParams[key].label || "",
        helperText: formFieldParams[key].helperText,
        isValid: false,
        isInteracted: false,
        isRequired: !!formFieldParams[key].required,
        error: undefined,
      };
    }
    for (const key in formFieldParams) {
      switch (true) {
        case _state[key].isRequired && !checkIfRequiredValueFilled(_state[key].value):
          _state[key].isValid = false;
          break;
        case Boolean(formFieldParams[key].validation):
          _state[key].isValid = Object.values(formFieldParams[key].validation!).every(({ validator }) =>
            validator(_state[key].value, _state)
          );
          break;
        default:
          _state[key].isValid = true;
      }
    }
    return _state;
  })();

  const [state, setState] = useState<FormState<Data>>(initialFormState);

  const inputDebounceRef = useRef<NodeJS.Timeout>();

  // --------------------------------------------------------------------

  // reinitialize state on dependencies change
  // this is useful when form state needs to be reset based on some external changes
  useEffect(() => {
    setState(initialFormState);
  }, [...reinitializeDependencies]);

  // --------------------------------------------------------------------

  const debouncedErrorUpdate = () => {
    runValidation({ updateErrorType: errorUpdateDelayInSeconds > 0 ? false : true });

    clearTimeout(inputDebounceRef.current);

    if (errorUpdateDelayInSeconds > 0) {
      inputDebounceRef.current = setTimeout(() => {
        runValidation();
      }, errorUpdateDelayInSeconds * 1000);
    }
  };

  // --------------------------------------------------------------------

  const set = <Key extends keyof Data>(key: Key, value: Data[Key], setInteracted: boolean = true) => {
    setState(_state => {
      _state[key].value = value;
      if (setInteracted) _state[key].isInteracted = true;
      return { ..._state };
    });
    debouncedErrorUpdate();
  };

  // --------------------------------------------------------------------

  const update = <Key extends keyof Data>(data: Partial<Data>, setInteracted: boolean = true) => {
    setState(_state => {
      Object.entries(data).forEach(([key, value]) => {
        _state[key as Key].value = value as Data[Key];
        if (setInteracted) _state[key as Key].isInteracted = true;
      });
      return { ..._state };
    });
    debouncedErrorUpdate();
  };

  // --------------------------------------------------------------------

  const runValidation = (options?: { updateErrorType?: boolean }) => {
    const { updateErrorType } = options || {};

    setState(_state => {
      for (let key in _state) {
        const shouldUpdateErrorType = updateErrorType ?? _state[key].isInteracted;

        switch (true) {
          case _state[key].isRequired && !checkIfRequiredValueFilled(_state[key].value):
            _state[key].isValid = false;
            _state[key].error = shouldUpdateErrorType
              ? { type: "required", message: formFieldParams[key].required?.message }
              : _state[key].error;
            break;
          case Boolean(formFieldParams[key].validation):
            let _error = undefined;
            _state[key].isValid = Object.entries(formFieldParams[key].validation!).every(
              ([validationType, { validator, message }]) => {
                const isValidationPassed = validator(_state[key].value, _state);
                if (!isValidationPassed) {
                  _error = { type: validationType, message: message || "" };
                }
                return isValidationPassed;
              }
            );
            _state[key].error = shouldUpdateErrorType ? _error : _state[key].error;
            break;
          default:
            _state[key].isValid = true;
            _state[key].error = shouldUpdateErrorType ? undefined : _state[key].error;
        }
      }
      return { ..._state };
    });
  };

  // --------------------------------------------------------------------

  const checkIfAllValid = (options?: { updateErrorType?: boolean }) => {
    const { updateErrorType = true } = options || {};

    if (updateErrorType) {
      runValidation({ updateErrorType: true });
    }

    for (let key in state) {
      if (!state[key].isValid) return false;
    }

    return true;
  };

  // --------------------------------------------------------------------

  type DataExtractFormat = "object" | "formdata";
  type DataExtractOptions<F> = {
    format: F;
  };
  type DataExtractOutput = {
    object: Data;
    formdata: FormData;
  };

  const extractStateValue = <F extends DataExtractFormat>({ format }: DataExtractOptions<F>): DataExtractOutput[F] => {
    switch (format) {
      case "formdata":
        const formData = new FormData();
        Object.entries(state).forEach(([key, data]) => {
          formData.append(key, (data as FormFieldState).value);
        });
        return formData as DataExtractOutput[F];
      case "object":
      default:
        let data = {} as Data;
        for (const key in state) {
          data[key] = state[key].value;
        }
        return data as DataExtractOutput[F];
    }
  };

  // --------------------------------------------------------------------

  const reset = () => {
    setState(initialFormState);
    clearTimeout(inputDebounceRef.current);
  };

  // --------------------------------------------------------------------

  return { state, set, update, checkIfAllValid, extractStateValue, reset };
};

const checkIfRequiredValueFilled = <T>(value: T) => {
  switch (typeof value) {
    case "number":
      if (isNaN(value) || !Number.isFinite(value)) return false;
      return true;
    case "object":
      if (Array.isArray(value)) return value.length > 0;
      if (value == null) return false;
      return Boolean(value);
    case "string":
    case "boolean":
    default:
      return Boolean(value);
  }
};

export { useFormState, FormFieldParams, FormState, FormFieldState, FormStateOptions };
