'use client';
import * as React from 'react';
import { useTimeout } from '@base-ui-components/utils/useTimeout';
import { useEventCallback } from '@base-ui-components/utils/useEventCallback';
import { useFieldRootContext } from '../root/FieldRootContext';
import { mergeProps } from '../../merge-props';
import { DEFAULT_VALIDITY_STATE } from '../utils/constants';
import { useFormContext } from '../../form/FormContext';
import { getCombinedFieldValidityData } from '../utils/getCombinedFieldValidityData';
import type { HTMLProps } from '../../utils/types';

const validityKeys = Object.keys(DEFAULT_VALIDITY_STATE) as Array<keyof ValidityState>;

function isOnlyValueMissing(state: Record<keyof ValidityState, boolean> | undefined) {
  if (!state || state.valid || !state.valueMissing) {
    return false;
  }

  let onlyValueMissing = false;

  for (const key of validityKeys) {
    if (key === 'valid') {
      continue;
    }
    if (key === 'valueMissing') {
      onlyValueMissing = state[key];
    }
    if (state[key]) {
      onlyValueMissing = false;
    }
  }

  return onlyValueMissing;
}

export function useFieldControlValidation() {
  const {
    setValidityData,
    validate,
    messageIds,
    validityData,
    validationMode,
    validationDebounceTime,
    invalid,
    markedDirtyRef,
    controlId,
    state,
    name,
  } = useFieldRootContext();

  const { formRef, clearErrors } = useFormContext();

  const timeout = useTimeout();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const commitValidation = useEventCallback(async (value: unknown, revalidate = false) => {
    const element = inputRef.current;
    if (!element) {
      return;
    }

    if (revalidate) {
      if (state.valid !== false) {
        return;
      }

      const currentNativeValidity = element.validity;

      if (!currentNativeValidity.valueMissing) {
        // The 'valueMissing' (required) condition has been resolved by the user typing.
        // Temporarily mark the field as valid for this onChange event.
        // Other native errors (e.g., typeMismatch) will be caught by full validation on blur or submit.
        const nextValidityData = {
          value,
          state: { ...DEFAULT_VALIDITY_STATE, valid: true },
          error: '',
          errors: [],
          initialValue: validityData.initialValue,
        };
        element.setCustomValidity('');

        if (controlId) {
          const currentFieldData = formRef.current.fields.get(controlId);
          if (currentFieldData) {
            formRef.current.fields.set(controlId, {
              ...currentFieldData,
              ...getCombinedFieldValidityData(nextValidityData, false), // invalid = false
            });
          }
        }
        setValidityData(nextValidityData);
        return;
      }

      // Value is still missing, or other conditions apply.
      // Let's use a representation of current validity for isOnlyValueMissing.
      const currentNativeValidityObject = validityKeys.reduce(
        (acc, key) => {
          acc[key] = currentNativeValidity[key];
          return acc;
        },
        {} as Record<keyof ValidityState, boolean>,
      );

      // If it's (still) natively invalid due to something other than just valueMissing,
      // then bail from this revalidation on change to avoid "scolding" for other errors.
      if (!currentNativeValidityObject.valid && !isOnlyValueMissing(currentNativeValidityObject)) {
        return;
      }

      // If valueMissing is still true AND it's the only issue, or if the field is now natively valid,
      // let it fall through to the main validation logic below.
    }

    function getState(el: HTMLInputElement) {
      const computedState = validityKeys.reduce(
        (acc, key) => {
          acc[key] = el.validity[key];
          return acc;
        },
        {} as Record<keyof ValidityState, boolean>,
      );

      let hasOnlyValueMissingError = false;

      for (const key of validityKeys) {
        if (key === 'valid') {
          continue;
        }
        if (key === 'valueMissing' && computedState[key]) {
          hasOnlyValueMissingError = true;
        } else if (computedState[key]) {
          return computedState;
        }
      }

      // Only make `valueMissing` mark the field invalid if it's been changed
      // to reduce error noise.
      if (hasOnlyValueMissingError && !markedDirtyRef.current) {
        computedState.valid = true;
        computedState.valueMissing = false;
      }
      return computedState;
    }

    timeout.clear();

    let result: null | string | string[] = null;
    let validationErrors: string[] = [];

    const nextState = getState(element);

    let defaultValidationMessage;

    if (element.validationMessage) {
      defaultValidationMessage = element.validationMessage;
      validationErrors = [element.validationMessage];
    } else {
      const formValues = Array.from(formRef.current.fields.values()).reduce(
        (acc, field) => {
          if (field.name && field.getValueRef) {
            acc[field.name] = field.getValueRef.current?.();
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

      const resultOrPromise = validate(value, formValues);
      if (
        typeof resultOrPromise === 'object' &&
        resultOrPromise !== null &&
        'then' in resultOrPromise
      ) {
        result = await resultOrPromise;
      } else {
        result = resultOrPromise;
      }

      if (result !== null) {
        nextState.valid = false;
        nextState.customError = true;

        if (Array.isArray(result)) {
          validationErrors = result;
          element.setCustomValidity(result.join('\n'));
        } else if (result) {
          validationErrors = [result];
          element.setCustomValidity(result);
        }
      }
    }

    const nextValidityData = {
      value,
      state: nextState,
      error: defaultValidationMessage ?? (Array.isArray(result) ? result[0] : (result ?? '')),
      errors: validationErrors,
      initialValue: validityData.initialValue,
    };

    if (controlId) {
      const currentFieldData = formRef.current.fields.get(controlId);
      if (currentFieldData) {
        formRef.current.fields.set(controlId, {
          ...currentFieldData,
          ...getCombinedFieldValidityData(nextValidityData, invalid),
        });
      }
    }

    setValidityData(nextValidityData);
  });

  const getValidationProps = React.useCallback(
    (externalProps = {}) =>
      mergeProps<any>(
        {
          ...(messageIds.length && { 'aria-describedby': messageIds.join(' ') }),
          ...(state.valid === false && { 'aria-invalid': true }),
        },
        externalProps,
      ),
    [messageIds, state.valid],
  );

  const getInputValidationProps = React.useCallback(
    (externalProps = {}) =>
      mergeProps<'input'>(
        {
          onChange(event) {
            // Workaround for https://github.com/facebook/react/issues/9023
            if (event.nativeEvent.defaultPrevented) {
              return;
            }

            clearErrors(name);

            if (validationMode !== 'onChange') {
              commitValidation(event.currentTarget.value, true);
              return;
            }

            if (invalid) {
              return;
            }

            const element = event.currentTarget;

            if (element.value === '') {
              // Ignore the debounce time for empty values.
              commitValidation(element.value);
              return;
            }

            timeout.clear();

            if (validationDebounceTime) {
              timeout.start(validationDebounceTime, () => {
                commitValidation(element.value);
              });
            } else {
              commitValidation(element.value);
            }
          },
        },
        getValidationProps(externalProps),
      ),
    [
      getValidationProps,
      clearErrors,
      name,
      timeout,
      commitValidation,
      invalid,
      validationMode,
      validationDebounceTime,
    ],
  );

  return React.useMemo(
    () => ({
      getValidationProps,
      getInputValidationProps,
      inputRef,
      commitValidation,
    }),
    [getValidationProps, getInputValidationProps, commitValidation],
  );
}

export namespace useFieldControlValidation {
  export interface ReturnValue {
    getValidationProps: (props?: HTMLProps) => HTMLProps;
    getInputValidationProps: (props?: HTMLProps) => HTMLProps;
    inputRef: React.MutableRefObject<any>;
    commitValidation: (value: unknown, revalidate?: boolean) => void;
  }
}
