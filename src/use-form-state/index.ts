import { useEffect, useRef, useState } from "react";
import { FormFieldParams, FormFieldState, FormState, FormStateOptions } from "../types";
import { appendToFormData, applyValidation, createInitialStateSnapshot } from "../utils";

// --------------------------------------------------------------------

const DEFAULT_ERROR_DELAY_SECONDS = 0.5;

// --------------------------------------------------------------------

const useFormState = <Data>(formFieldParams: FormFieldParams<Data>, options: FormStateOptions = {}) => {
  const { errorUpdateDelayInSeconds = DEFAULT_ERROR_DELAY_SECONDS, reinitializeDependencies = [] } = options;

  const [state, setState] = useState<FormState<Data>>(() => createInitialStateSnapshot(formFieldParams));

  // track timer and an incrementing run id so stale callbacks no-op
  const validationScheduleRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; runId: number }>({
    timer: null,
    runId: 0,
  });
  // keep the validation result with updated errors until the delay expires, then commit it
  const pendingErrorStateRef = useRef<FormState<Data> | null>(null);

  const clearPendingValidation = () => {
    validationScheduleRef.current.runId += 1;
    pendingErrorStateRef.current = null;
    if (validationScheduleRef.current.timer !== null) {
      clearTimeout(validationScheduleRef.current.timer);
      validationScheduleRef.current.timer = null;
    }
  };

  // --------------------------------------------------------------------

  // reinitialize state on dependencies change
  // this is useful when form state needs to be reset based on some external changes
  useEffect(() => {
    clearPendingValidation();
    setState(createInitialStateSnapshot(formFieldParams));
  }, [...reinitializeDependencies]);

  // clear any pending timers on unmount to avoid stale commits after reset/reinit
  useEffect(() => () => clearPendingValidation(), []);

  // --------------------------------------------------------------------

  // validation flow: runs validation immediately, but when delaying errors it stages the new errors and
  // keeps the previous ones visible until the timer commits, avoiding flicker when users are typing.
  const scheduleValidationRun = (options?: { updateErrorType?: boolean }) => {
    const { updateErrorType } = options || {};

    clearPendingValidation();
    const runId = validationScheduleRef.current.runId;
    const shouldDelayErrorUpdate = errorUpdateDelayInSeconds > 0 && updateErrorType !== false;

    setState(prevState => {
      const { nextState } = applyValidation(prevState, formFieldParams, { updateErrorType });

      if (!shouldDelayErrorUpdate) {
        pendingErrorStateRef.current = null;
        return nextState;
      }

      pendingErrorStateRef.current = nextState;

      const immediateState = Object.keys(nextState).reduce((acc, key) => {
        const k = key as keyof Data;
        acc[k] = { ...nextState[k], error: prevState[k].error };
        return acc;
      }, {} as FormState<Data>);

      return immediateState;
    });

    if (shouldDelayErrorUpdate) {
      validationScheduleRef.current.timer = setTimeout(() => {
        if (runId !== validationScheduleRef.current.runId) return;
        const pending = pendingErrorStateRef.current;
        if (!pending) return;
        pendingErrorStateRef.current = null;
        setState(() => ({ ...pending } as FormState<Data>));
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
    const updateErrorType = setInteracted ? true : undefined;
    scheduleValidationRun({ updateErrorType });
  };

  // --------------------------------------------------------------------

  const setMany = <Key extends keyof Data>(data: Partial<Data>, setInteracted: boolean = true) => {
    setState(_state => {
      Object.entries(data).forEach(([key, value]) => {
        _state[key as Key].value = value as Data[Key];
        if (setInteracted) _state[key as Key].isInteracted = true;
      });
      return { ..._state };
    });
    const updateErrorType = setInteracted ? true : undefined;
    scheduleValidationRun({ updateErrorType });
  };

  // --------------------------------------------------------------------

  const checkIfAllValid = (options?: { updateErrorType?: boolean; commitState?: boolean }) => {
    const { updateErrorType = true, commitState = true } = options || {};

    // allow callers to just check validity without disrupting pending error updates or triggering renders
    if (!commitState) {
      const { allValid } = applyValidation(state, formFieldParams, { updateErrorType });
      return allValid;
    }

    clearPendingValidation();

    let allValid = true;
    setState(_state => {
      const { nextState, allValid: validated } = applyValidation(_state, formFieldParams, { updateErrorType });
      allValid = validated;
      return nextState;
    });

    return allValid;
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

  const getValues = <F extends DataExtractFormat>({ format }: DataExtractOptions<F>): DataExtractOutput[F] => {
    switch (format) {
      case "formdata":
        const formData = new FormData();
        Object.entries(state).forEach(([key, data]) => {
          appendToFormData(formData, key, (data as FormFieldState).value);
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
    clearPendingValidation();
    setState(createInitialStateSnapshot(formFieldParams));
  };

  // --------------------------------------------------------------------

  return { state, set, setMany, checkIfAllValid, getValues, reset };
};

export { useFormState };
