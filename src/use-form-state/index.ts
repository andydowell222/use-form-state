import { useRef, useState } from 'react';

type ErrorType = 'format' | 'required';

type FormStateProps<Data> = {
  [Key in keyof Data]: {
    defaultValue: Data[Key];
    isRequired?: boolean;
    validator?: (value: any, formState: FormState<Data>) => boolean;
    helperText?: string;
    errorMessage?: { [key in ErrorType]?: string };
  };
};

type FormStateOptions = {
  errorUpdateDelayInSeconds?: number;
};

type FormState<Data> = {
  [Key in keyof Data]: FormFieldState<Data[Key]>;
};

type FormFieldState<V = any> = {
  value: V;
  isValid: boolean;
  isInteracted: boolean;
  isRequired: boolean;
  helperText?: string;
  error?: {
    type?: ErrorType;
    message?: string;
  };
};

// --------------------------------------------------------------------

const useFormState = <Data>(
  formStateProps: FormStateProps<Data>,
  options: FormStateOptions = {}
) => {
  const { errorUpdateDelayInSeconds = 0.5 } = options;

  const initialFormState = (() => {
    const _state = {} as FormState<Data>;
    for (const key in formStateProps) {
      _state[key] = {
        value: formStateProps[key].defaultValue,
        helperText: formStateProps[key].helperText,
        isValid: false,
        isInteracted: false,
        isRequired: !!formStateProps[key].isRequired,
        error: undefined,
      };
    }
    for (const key in formStateProps) {
      switch (true) {
        case formStateProps[key].isRequired &&
          !checkIfRequiredValueFilled(_state[key].value):
          _state[key].isValid = false;
          break;
        case Boolean(formStateProps[key].validator):
          _state[key].isValid = formStateProps[key].validator!(
            _state[key].value,
            _state
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

  const debouncedErrorUpdate = () => {
    clearTimeout(inputDebounceRef.current);
    inputDebounceRef.current = setTimeout(() => {
      runValidation();
    }, errorUpdateDelayInSeconds * 1000);
  };

  // --------------------------------------------------------------------

  const set = <Key extends keyof Data>(
    key: Key,
    value: Data[Key],
    setInteracted: boolean = true
  ) => {
    setState(_state => {
      _state[key].value = value;
      if (setInteracted) _state[key].isInteracted = true;
      return { ..._state };
    });
    runValidation({ updateErrorType: false }); // errorType update is to be debounced on input change
    debouncedErrorUpdate();
  };

  // --------------------------------------------------------------------

  const runValidation = (options?: { updateErrorType?: boolean }) => {
    const { updateErrorType } = options || {};

    setState(_state => {
      for (let key in _state) {
        const shouldUpdateErrorType =
          updateErrorType ?? _state[key].isInteracted;

        switch (true) {
          case formStateProps[key].isRequired &&
            !checkIfRequiredValueFilled(_state[key].value):
            _state[key].isValid = false;
            _state[key].error = shouldUpdateErrorType
              ? {
                  type: 'required',
                  message: formStateProps[key].errorMessage?.required,
                }
              : _state[key].error;
            break;
          case Boolean(formStateProps[key].validator):
            let isValid = formStateProps[key].validator!(
              _state[key].value,
              _state
            );
            _state[key].isValid = isValid;
            _state[key].error = shouldUpdateErrorType
              ? isValid
                ? undefined
                : {
                    type: 'format',
                    message: formStateProps[key].errorMessage?.format,
                  }
              : _state[key].error;
            break;
          default:
            _state[key].isValid = true;
            _state[key].error = shouldUpdateErrorType
              ? undefined
              : _state[key].error;
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

  type DataExtractFormat = 'object' | 'formdata';
  type DataExtractOptions<F> = {
    format: F;
  };
  type DataExtractOutput = {
    object: Data;
    formdata: FormData;
  };

  const extractStateValue = <F extends DataExtractFormat>({
    format,
  }: DataExtractOptions<F>): DataExtractOutput[F] => {
    switch (format) {
      case 'formdata':
        const formData = new FormData();
        Object.entries(state).forEach(([key, data]) => {
          formData.append(key, (data as FormFieldState).value);
        });
        return formData as DataExtractOutput[F];
      case 'object':
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

  return { state, set, checkIfAllValid, extractStateValue, reset };
};

const checkIfRequiredValueFilled = <T>(value: T) => {
  switch (typeof value) {
    case 'number':
      if (isNaN(value) || !Number.isFinite(value)) return false;
      return true;
    case 'object':
      if (Array.isArray(value)) return value.length > 0;
      if (value == null) return false;
      return Boolean(value);
    case 'string':
    case 'boolean':
    default:
      return Boolean(value);
  }
};

export {
  useFormState,
  FormStateProps,
  FormState,
  FormFieldState,
  FormStateOptions,
};
