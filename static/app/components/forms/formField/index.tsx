import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from '@emotion/styled';
import {Observer} from 'mobx-react';

import Alert from 'sentry/components/alert';
import Button from 'sentry/components/button';
import Field, {FieldProps} from 'sentry/components/forms/field';
import FieldControl from 'sentry/components/forms/field/fieldControl';
import FieldErrorReason from 'sentry/components/forms/field/fieldErrorReason';
import FormContext from 'sentry/components/forms/formContext';
import FormFieldControlState from 'sentry/components/forms/formField/controlState';
import FormModel, {MockModel} from 'sentry/components/forms/model';
import ReturnButton from 'sentry/components/forms/returnButton';
import PanelAlert from 'sentry/components/panels/panelAlert';
import {t} from 'sentry/locale';
import {defined} from 'sentry/utils';
import {sanitizeQuerySelector} from 'sentry/utils/sanitizeQuerySelector';

import {FieldValue} from '../type';

/**
 * Some fields don't need to implement their own onChange handlers, in
 * which case we will receive an Event, but if they do we should handle
 * the case where they return a value as the first argument.
 */
const getValueFromEvent = (valueOrEvent?: FieldValue | MouseEvent, e?: MouseEvent) => {
  const event = e || valueOrEvent;
  const value = defined(e) ? valueOrEvent : event?.target?.value;

  return {value, event};
};

/**
 * This is a list of field properties that can accept a function taking the
 * form model, that will be called to determine the value of the prop upon an
 * observed change in the model.
 *
 * This uses mobx's observation of the models observable fields.
 */

// !!Warning!! - the order of these props matters, as they are checked in order that they appear.
// One instance of a test that relies on this order is accountDetails.spec.tsx.
const propsToObserve = ['help', 'highlighted', 'inline', 'visible', 'disabled'] as const;

interface FormFieldPropModel extends FormFieldProps {
  model: FormModel;
}

type ObservedFn<_P, T> = (props: FormFieldPropModel) => T;
type ObservedFnOrValue<P, T> = T | ObservedFn<P, T>;

type ObserverdPropNames = typeof propsToObserve[number];

type ObservedPropResolver = [
  ObserverdPropNames,
  () => ResolvedObservableProps[ObserverdPropNames]
];

/**
 * Construct the type for properties that may be given observed functions
 */
interface ObservableProps {
  disabled?: ObservedFnOrValue<{}, FieldProps['disabled']>;
  help?: ObservedFnOrValue<{}, FieldProps['help']>;
  highlighted?: ObservedFnOrValue<{}, FieldProps['highlighted']>;
  inline?: ObservedFnOrValue<{}, FieldProps['inline']>;
  visible?: ObservedFnOrValue<{}, FieldProps['visible']>;
}

/**
 * The same ObservableProps, once they have been resolved
 */
interface ResolvedObservableProps {
  disabled?: FieldProps['disabled'];
  help?: FieldProps['help'];
  highlighted?: FieldProps['highlighted'];
  inline?: FieldProps['inline'];
  visible?: FieldProps['visible'];
}

interface BaseProps {
  /**
   * Used to render the actual control
   */
  children: (renderProps) => React.ReactNode;
  /**
   * Name of the field
   */
  name: string;
  // TODO(ts): These are actually props that are needed for some lower
  // component. We should let the rendering component pass these in instead
  defaultValue?: FieldValue;
  formatMessageValue?: boolean | Function;
  /**
   * Transform data when saving on blur.
   */
  getData?: (value: any) => any;
  /**
   * Should hide error message?
   */
  hideErrorMessage?: boolean;
  onBlur?: (value, event) => void;
  onChange?: (value, event) => void;
  onKeyDown?: (value, event) => void;
  placeholder?: ObservedFnOrValue<{}, React.ReactNode>;

  resetOnError?: boolean;
  /**
   * The message to display when saveOnBlur is false
   */
  saveMessage?:
    | React.ReactNode
    | ((props: PassthroughProps & {value: FieldValue}) => React.ReactNode);
  /**
   * The alert type to use when saveOnBlur is false
   */
  saveMessageAlertType?: React.ComponentProps<typeof Alert>['type'];

  /**
   * When the field is blurred should it automatically persist its value into
   * the model. Will show a confirm button 'save' otherwise.
   */
  saveOnBlur?: boolean;
  /**
   * A function producing an optional component with extra information.
   */
  selectionInfoFunction?: (
    props: PassthroughProps & {value: FieldValue; error?: string}
  ) => React.ReactNode;
  /**
   * Extra styles to apply to the field
   */
  style?: React.CSSProperties;
  /**
   * Transform input when a value is set to the model.
   */
  transformInput?: (value: any) => any; // used in prettyFormString
}

export interface FormFieldProps
  extends BaseProps,
    ObservableProps,
    Omit<FieldProps, keyof ResolvedObservableProps | 'children'> {}

/**
 * ResolvedProps do NOT include props which may be given functions that are
 * reacted on. Resolved props are used inside of makeField.
 */
type ResolvedProps = BaseProps & FieldProps;

type PassthroughProps = Omit<
  ResolvedProps,
  | 'className'
  | 'name'
  | 'hideErrorMessage'
  | 'flexibleControlStateSize'
  | 'saveOnBlur'
  | 'saveMessage'
  | 'saveMessageAlertType'
  | 'selectionInfoFunction'
  | 'hideControlState'
  | 'defaultValue'
>;

function FormField(props: FormFieldProps) {
  const initialProps = useRef(props);

  const {name, onBlur, onChange, onKeyDown} = props;

  const context = useContext(FormContext);
  const inputRef = useRef<HTMLElement>();

  const [model] = useState<FormModel>(
    // XXX: MockModel doesn't fully implement the FormModel interface
    () => context.form ?? (new MockModel(props) as any)
  );

  // Register field within the model
  useEffect(() => {
    model.setFieldDescriptor(name, initialProps.current);
    return () => model.removeField(name);
  }, [model, name]);

  /**
   * Update field value in form model
   */
  const handleChange = useCallback(
    (...args) => {
      const {value, event} = getValueFromEvent(...args);
      onChange?.(value, event);
      model.setValue(name, value);
    },
    [model, onChange, name]
  );

  /**
   * Notify model of a field being blurred
   */
  const handleBlur = useCallback(
    (...args) => {
      const {value, event} = getValueFromEvent(...args);

      onBlur?.(value, event);
      // Always call this, so model can decide what to do
      model.handleBlurField(name, value);
    },
    [model, onBlur, name]
  );

  /**
   * Handle keydown to trigger a save on Enter
   */
  const handleKeyDown = useCallback(
    (...args) => {
      const {value, event} = getValueFromEvent(...args);

      if (event.key === 'Enter') {
        model.handleBlurField(name, value);
      }

      onKeyDown?.(value, event);
    },
    [model, onKeyDown, name]
  );

  /**
   * Handle saving an individual field via UI button
   */
  const handleSaveField = useCallback(
    () => model.handleSaveField(name, model.getValue(name)),
    [model, name]
  );

  const handleCancelField = useCallback(
    () => model.handleCancelSaveField(name),
    [model, name]
  );

  /**
   * Attempts to autofocus input field if field's name is in url hash.
   *
   * The ref must be forwarded for this to work.
   */
  const handleInputMount = useCallback(
    (node: HTMLElement | null) => {
      if (node && !inputRef.current) {
        // TODO(mark) Clean this up. FormContext could include the location
        const hash = window.location?.hash;

        if (!hash) {
          return;
        }

        if (hash !== `#${name}`) {
          return;
        }

        // Not all form fields have this (e.g. Select fields)
        if (typeof node.focus === 'function') {
          node.focus();
        }
      }

      inputRef.current = node ?? undefined;
    },
    [name]
  );

  const getError = useCallback(() => model.getError(name), [model, name]);
  const id = useMemo(() => sanitizeQuerySelector(name), [name]);

  const makeField = useCallback(
    (resolvedObservedProps?: ResolvedObservableProps) => {
      const {
        className,
        hideErrorMessage,
        flexibleControlStateSize,
        saveMessage,
        saveMessageAlertType,
        selectionInfoFunction,
        hideControlState,
        // Don't pass `defaultValue` down to input fields, will be handled in
        // form model
        defaultValue: _defaultValue,
        ...otherProps
      } = props;

      const saveOnBlurFieldOverride =
        typeof props.saveOnBlur !== 'undefined' && !props.saveOnBlur;
      const fieldProps = {...otherProps, ...resolvedObservedProps} as PassthroughProps;

      return (
        <Fragment>
          <Field
            id={id}
            className={className}
            flexibleControlStateSize={flexibleControlStateSize}
            {...fieldProps}
          >
            {({alignRight, inline, disabled, disabledReason}) => (
              <FieldControl
                disabled={disabled}
                disabledReason={disabledReason}
                inline={inline}
                alignRight={alignRight}
                flexibleControlStateSize={flexibleControlStateSize}
                hideControlState={hideControlState}
                controlState={<FormFieldControlState model={model} name={name} />}
                errorState={
                  <Observer>
                    {() => {
                      const error = getError();
                      const shouldShowErrorMessage = error && !hideErrorMessage;
                      if (!shouldShowErrorMessage) {
                        return null;
                      }
                      return <FieldErrorReason>{error}</FieldErrorReason>;
                    }}
                  </Observer>
                }
              >
                <Observer>
                  {() => {
                    const error = getError();
                    const value = model.getValue(name);
                    const showReturnButton = model.getFieldState(
                      name,
                      'showReturnButton'
                    );

                    return (
                      <Fragment>
                        {props.children({
                          ref: handleInputMount,
                          ...props,
                          model,
                          name,
                          id,
                          onKeyDown: handleKeyDown,
                          onChange: handleChange,
                          onBlur: handleBlur,
                          // Fixes react warnings about input switching from controlled to uncontrolled
                          // So force to empty string for null values
                          value: value === null ? '' : value,
                          error,
                          disabled,
                          initialData: model.initialData,
                        })}
                        {showReturnButton && <StyledReturnButton />}
                      </Fragment>
                    );
                  }}
                </Observer>
              </FieldControl>
            )}
          </Field>
          {selectionInfoFunction && (
            <Observer>
              {() => {
                const error = getError();
                const value = model.getValue(name);

                const isVisible =
                  typeof fieldProps.visible === 'function'
                    ? fieldProps.visible({...props, ...fieldProps} as ResolvedProps)
                    : true;

                return (
                  <Fragment>
                    {isVisible
                      ? selectionInfoFunction({...fieldProps, error, value})
                      : null}
                  </Fragment>
                );
              }}
            </Observer>
          )}
          {saveOnBlurFieldOverride && (
            <Observer>
              {() => {
                const showFieldSave = model.getFieldState(name, 'showSave');
                const value = model.getValue(name);

                if (!showFieldSave) {
                  return null;
                }

                return (
                  <PanelAlert
                    type={saveMessageAlertType}
                    trailingItems={
                      <Fragment>
                        <Button onClick={handleCancelField} size="xs">
                          {t('Cancel')}
                        </Button>
                        <Button priority="primary" size="xs" onClick={handleSaveField}>
                          {t('Save')}
                        </Button>
                      </Fragment>
                    }
                  >
                    {typeof saveMessage === 'function'
                      ? saveMessage({...fieldProps, value})
                      : saveMessage}
                  </PanelAlert>
                );
              }}
            </Observer>
          )}
        </Fragment>
      );
    },
    [
      getError,
      handleBlur,
      handleCancelField,
      handleChange,
      handleInputMount,
      handleKeyDown,
      handleSaveField,
      id,
      model,
      name,
      props,
    ]
  );

  const observedProps = propsToObserve
    .filter(p => typeof props[p] === 'function')
    .map<ObservedPropResolver>(p => [
      p,
      () => (props[p] as ObservedFn<{}, any>)({...props, model}),
    ]);

  // This field has no properties that require observation to compute their
  // value, this field is static and will not be re-rendered.
  if (observedProps.length === 0) {
    return makeField();
  }

  const resolveObservedProps = (
    resolvedProps: ResolvedObservableProps,
    [propName, resolve]: ObservedPropResolver
  ) => ({
    ...resolvedProps,
    [propName]: resolve(),
  });

  return (
    <Observer>{() => makeField(observedProps.reduce(resolveObservedProps, {}))}</Observer>
  );
}

export default FormField;

const StyledReturnButton = styled(ReturnButton)`
  position: absolute;
  right: 0;
  top: 0;
`;
