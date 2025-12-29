import { ValidationParams, FormFieldParams, FormState, FormFieldState } from "../types";

const appendToFormData = (formData: FormData, key: string, value: unknown) => {
  if (value instanceof FileList) {
    Array.from(value).forEach(file => formData.append(key, file));
    return;
  }
  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  if (value instanceof Date) {
    formData.append(key, value.toISOString());
    return;
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries());
    formData.append(key, JSON.stringify(entries));
    return;
  }
  if (value instanceof Set) {
    const entries = Array.from(value.values());
    formData.append(key, JSON.stringify(entries));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => appendToFormData(formData, key, item));
    return;
  }
  if (value !== null && typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, value == null ? "" : String(value));
};

// Clone the whole form state so validators cannot mutate the live object
const cloneFormState = <Data>(state: FormState<Data>): FormState<Data> => {
  const clonedState = {} as FormState<Data>;

  for (const key in state) {
    clonedState[key] = {
      ...state[key],
      value: deepCloneValue(state[key].value),
    };
    Object.freeze(clonedState[key]);
  }

  return Object.freeze(clonedState);
};

/**
 * Runs validations using the provided state and field params.
 * Makes a cloned, frozen snapshot so validators cannot mutate the live state.
 */
const applyValidation = <Data>(
  currentState: FormState<Data>,
  formFieldParams: FormFieldParams<Data>,
  options?: { updateErrorType?: boolean }
) => {
  const { updateErrorType } = options || {};
  const stateSnapshot = cloneFormState(currentState);
  const nextState = {} as FormState<Data>;
  let allValid = true;

  for (const key in stateSnapshot) {
    const fieldKey = key as keyof Data;
    const prevFieldState = stateSnapshot[fieldKey];
    const shouldUpdateErrorType = updateErrorType ?? prevFieldState.isInteracted;
    const { isValid, error } = getFieldValidationOutcome(fieldKey, formFieldParams, stateSnapshot);

    if (!isValid) allValid = false;

    nextState[fieldKey] = {
      ...prevFieldState,
      isValid,
      error: shouldUpdateErrorType ? error : prevFieldState.error,
    };
  }

  return { nextState, allValid };
};

const checkIfRequiredValueFilled = <T>(value: T) => {
  switch (typeof value) {
    case "number":
      if (isNaN(value) || !Number.isFinite(value)) return false;
      return true;
    case "object":
      if (Array.isArray(value)) return value.length > 0;
      if (value == null) return false;
      if (value instanceof Date) return !isNaN(value.getTime());
      if (value instanceof Map || value instanceof Set) return value.size > 0;
      const isFileList = typeof FileList !== "undefined" && value instanceof FileList;
      if (isFileList) return (value as unknown as FileList).length > 0;
      return Object.keys(value as Record<string, unknown>).length > 0;
    case "boolean":
      return true;
    case "string":
    default:
      return Boolean(value);
  }
};

const createInitialStateSnapshot = <Data>(formFieldParams: FormFieldParams<Data>): FormState<Data> => {
  const snapshot = {} as FormState<Data>;
  for (const key in formFieldParams) {
    snapshot[key] = {
      value: deepCloneValue(formFieldParams[key].defaultValue),
      label: formFieldParams[key].label || "",
      helperText: formFieldParams[key].helperText,
      isValid: false,
      isInteracted: false,
      isRequired: !!formFieldParams[key].required,
      error: undefined,
    };
  }
  for (const key in formFieldParams) {
    const fieldKey = key as keyof Data;
    const { isValid } = getFieldValidationOutcome(fieldKey, formFieldParams, snapshot);
    snapshot[fieldKey].isValid = isValid;
  }
  return snapshot;
};

const cloneFileList = (value: FileList): FileList => {
  if (typeof DataTransfer === "undefined") return value; // best effort without DOM
  const dataTransfer = new DataTransfer();
  Array.from(value).forEach(file => dataTransfer.items.add(file));
  return dataTransfer.files;
};

const deepCloneValue = <T>(value: T): T => {
  const structuredCloneFn = (globalThis as { structuredClone?: <U>(value: U) => U }).structuredClone;
  if (structuredCloneFn) {
    try {
      return structuredCloneFn(value);
    } catch {
      // fall through to manual clone for unsupported structured clone types
    }
  }
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return (new Date(value.getTime()) as unknown) as T;
  if (value instanceof Map) {
    const clonedEntries = Array.from(
      value.entries(),
      ([key, val]) => [deepCloneValue(key), deepCloneValue(val)] as const
    );
    return (new Map(clonedEntries) as unknown) as T;
  }
  if (value instanceof Set) {
    const clonedValues = Array.from(value.values()).map(deepCloneValue);
    return (new Set(clonedValues) as unknown) as T;
  }
  const isFileList = typeof FileList !== "undefined" && value instanceof FileList;
  if (isFileList) return (cloneFileList(value as unknown as FileList) as unknown) as T;
  if (value instanceof Blob) return value;
  if (Array.isArray(value)) return (value.map(deepCloneValue) as unknown) as T;
  return Object.entries(value as Record<string, unknown>).reduce((acc, [key, val]) => {
    acc[key] = deepCloneValue(val);
    return acc;
  }, {} as Record<string, unknown>) as T;
};

const getOrderedValidationEntries = <Value, Data>(validationParams: ValidationParams<Value, Data>) => {
  const entriesWithOrder = Object.entries(validationParams).map(([key, params], index) => ({
    entry: [key, params] as const,
    order: params.order ?? index,
    index,
  }));

  return entriesWithOrder
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.index - b.index; // preserve insertion order when order is omitted
    })
    .map(({ entry }) => entry);
};

type FieldValidationResult = {
  isValid: boolean;
  error?: FormFieldState["error"];
};

const getFieldValidationOutcome = <Data>(
  key: keyof Data,
  formFieldParams: FormFieldParams<Data>,
  state: FormState<Data>
): FieldValidationResult => {
  const fieldParams = formFieldParams[key];
  const fieldState = state[key];

  if (fieldState.isRequired && !checkIfRequiredValueFilled(fieldState.value)) {
    return {
      isValid: false,
      error: { type: "required", message: fieldParams.required?.message },
    };
  }

  if (fieldParams.validation) {
    let validationError: FieldValidationResult["error"];
    const isValid = getOrderedValidationEntries(fieldParams.validation).every(
      ([validationType, { validator, message }]) => {
        const passed = validator(fieldState.value, state);
        if (!passed) {
          validationError = { type: validationType, message: message || "" };
        }
        return passed;
      }
    );
    return { isValid, error: validationError };
  }

  return { isValid: true, error: undefined };
};

export {
  appendToFormData,
  applyValidation,
  checkIfRequiredValueFilled,
  createInitialStateSnapshot,
  getOrderedValidationEntries,
  getFieldValidationOutcome,
};
