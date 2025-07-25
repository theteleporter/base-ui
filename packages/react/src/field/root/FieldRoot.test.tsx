import * as React from 'react';
import { Form } from '@base-ui-components/react/form';
import { NumberField } from '@base-ui-components/react/number-field';
import { Radio } from '@base-ui-components/react/radio';
import { RadioGroup } from '@base-ui-components/react/radio-group';
import { Select } from '@base-ui-components/react/select';
import { Checkbox } from '@base-ui-components/react/checkbox';
import { CheckboxGroup } from '@base-ui-components/react/checkbox-group';
import { Switch } from '@base-ui-components/react/switch';
import { Slider } from '@base-ui-components/react/slider';
import { Field } from '@base-ui-components/react/field';
import { act, fireEvent, flushMicrotasks, screen, waitFor } from '@mui/internal-test-utils';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Field.Root />', () => {
  const { render } = createRenderer();

  describeConformance(<Field.Root />, () => ({
    refInstanceof: window.HTMLDivElement,
    render,
  }));

  it('should not mark invalid if `valueMissing` is the only error and not yet dirtied', async () => {
    await render(
      <Field.Root>
        <Field.Control data-testid="control" required />
      </Field.Root>,
    );

    const control = screen.getByTestId('control');

    fireEvent.focus(control);
    fireEvent.blur(control);

    expect(control).not.to.have.attribute('data-invalid');
    expect(control).not.to.have.attribute('aria-invalid');
  });

  it('should mark invalid if `valueMissing` is the only error and dirtied', async () => {
    await render(
      <Field.Root>
        <Field.Control data-testid="control" required />
      </Field.Root>,
    );

    const control = screen.getByTestId('control');

    fireEvent.focus(control);
    fireEvent.change(control, { target: { value: 'a' } });
    fireEvent.change(control, { target: { value: '' } });
    fireEvent.blur(control);

    expect(control).to.have.attribute('data-invalid', '');
    expect(control).to.have.attribute('aria-invalid', 'true');
  });

  describe('prop: disabled', () => {
    it('should add data-disabled style hook to all components', async () => {
      await render(
        <Field.Root data-testid="field" disabled>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="message" />
        </Field.Root>,
      );

      const field = screen.getByTestId('field');
      const control = screen.getByTestId('control');
      const label = screen.getByTestId('label');
      const message = screen.getByTestId('message');

      expect(field).to.have.attribute('data-disabled', '');
      expect(control).to.have.attribute('data-disabled', '');
      expect(label).to.have.attribute('data-disabled', '');
      expect(message).to.have.attribute('data-disabled', '');
    });
  });

  describe('prop: validate', () => {
    it('should validate the field on blur', async () => {
      await render(
        <Field.Root validate={() => 'error'}>
          <Field.Control />
          <Field.Error />
        </Field.Root>,
      );

      const control = screen.getByRole('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.focus(control);
      fireEvent.blur(control);

      expect(screen.queryByText('error')).not.to.equal(null);
    });

    it('supports async validation', async () => {
      await render(
        <Field.Root validate={() => Promise.resolve('error')}>
          <Field.Control />
          <Field.Error />
        </Field.Root>,
      );

      const control = screen.getByRole('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.focus(control);
      fireEvent.blur(control);

      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.queryByText('error')).not.to.equal(null);
      });
    });

    it('runs after native validations', async () => {
      await render(
        <Field.Root validate={() => 'custom error'}>
          <Field.Control required />
          <Field.Error match="valueMissing">value missing</Field.Error>
          <Field.Error match="customError" />
        </Field.Root>,
      );

      expect(screen.queryByText('value missing')).to.equal(null);
      expect(screen.queryByText('custom error')).to.equal(null);

      const input = screen.getByRole<HTMLInputElement>('textbox');

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.queryByText('value missing')).to.not.equal(null);
      });
      await waitFor(() => {
        expect(screen.queryByText('custom error')).to.equal(null);
      });

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByText('value missing')).to.equal(null);
      });
      await waitFor(() => {
        expect(screen.queryByText('custom error')).to.not.equal(null);
      });
    });

    it('should apply [data-field] style hooks to field components', async () => {
      await render(
        <Field.Root>
          <Field.Label data-testid="label">Label</Field.Label>
          <Field.Description data-testid="description">Description</Field.Description>
          <Field.Error data-testid="error" />
          <Field.Control data-testid="control" required />
        </Field.Root>,
      );

      const control = screen.getByTestId<HTMLInputElement>('control');
      const label = screen.getByTestId('label');
      const description = screen.getByTestId('description');
      let error = screen.queryByTestId('error');

      expect(control).not.to.have.attribute('data-valid');
      expect(label).not.to.have.attribute('data-valid');
      expect(description).not.to.have.attribute('data-valid');
      expect(error).to.equal(null);

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'a' } });
      fireEvent.change(control, { target: { value: '' } });
      fireEvent.blur(control);

      error = screen.getByTestId('error');

      expect(control).to.have.attribute('data-invalid', '');
      expect(label).to.have.attribute('data-invalid', '');
      expect(description).to.have.attribute('data-invalid', '');
      expect(error).to.have.attribute('data-invalid', '');

      act(() => {
        control.value = 'value';
        control.focus();
        control.blur();
      });

      error = screen.queryByTestId('error');

      expect(control).to.have.attribute('data-valid', '');
      expect(label).to.have.attribute('data-valid', '');
      expect(description).to.have.attribute('data-valid', '');
      expect(error).to.equal(null);
    });

    it('should apply aria-invalid prop to control once validated', async () => {
      await render(
        <Field.Root validate={() => 'error'}>
          <Field.Control />
          <Field.Error />
        </Field.Root>,
      );

      const control = screen.getByRole('textbox');

      expect(control).not.to.have.attribute('aria-invalid');

      fireEvent.focus(control);
      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid', 'true');
    });

    it('receives all form values as the 2nd argument', async () => {
      const validateSpy = spy();

      await render(
        <Form>
          <Field.Root name="checkbox">
            <Checkbox.Root defaultChecked />
          </Field.Root>

          <Field.Root name="checkbox-group">
            <CheckboxGroup defaultValue={['apple', 'banana']}>
              <Checkbox.Root value="apple" />
              <Checkbox.Root value="banana" />
            </CheckboxGroup>
          </Field.Root>

          <Field.Root name="input" validate={validateSpy}>
            <Field.Control data-testid="input" type="url" defaultValue="https://base-ui.com" />
          </Field.Root>

          <Field.Root name="number-field">
            <NumberField.Root defaultValue={13}>
              <NumberField.Input />
            </NumberField.Root>
          </Field.Root>

          <Field.Root name="radio-group">
            <RadioGroup defaultValue="cats">
              <Radio.Root value="cats" />
            </RadioGroup>
          </Field.Root>

          <Field.Root name="select">
            <Select.Root defaultValue="sans">
              <Select.Trigger />
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    <Select.Item value="sans" />
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </Field.Root>

          <Field.Root name="slider">
            <Slider.Root defaultValue={12}>
              <Slider.Control />
            </Slider.Root>
          </Field.Root>

          <Field.Root name="range-slider">
            <Slider.Root defaultValue={[25, 70]}>
              <Slider.Control />
            </Slider.Root>
          </Field.Root>

          <Field.Root name="switch">
            <Switch.Root defaultChecked={false} />
          </Field.Root>
        </Form>,
      );

      const input = screen.getByTestId('input');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(validateSpy.callCount).to.equal(1);
      expect(validateSpy.firstCall.args[1]).to.deep.equal({
        checkbox: true,
        'checkbox-group': ['apple', 'banana'],
        input: 'https://base-ui.com',
        'number-field': 13,
        'radio-group': 'cats',
        select: 'sans',
        slider: 12,
        'range-slider': [25, 70],
        switch: false,
      });
    });

    it('unmounted fields are excluded from the validate fn', async () => {
      const validateSpy = spy();
      function App() {
        const [checked, setChecked] = React.useState(true);

        return (
          <Form>
            <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} />
            {checked && (
              <Field.Root name="input1">
                <Field.Control data-testid="input1" defaultValue="one" />
              </Field.Root>
            )}
            <Field.Root name="input2" validate={validateSpy}>
              <Field.Control data-testid="input2" defaultValue="two" />
            </Field.Root>
            <button>Submit</button>
          </Form>
        );
      }
      await render(<App />);

      const input = screen.getByTestId('input2');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(validateSpy.callCount).to.equal(1);
      expect(validateSpy.firstCall.args[1]).to.deep.equal({
        input1: 'one',
        input2: 'two',
      });

      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(validateSpy.callCount).to.equal(2);
      expect(validateSpy.lastCall.args[1]).to.deep.equal({
        input2: 'two',
      });
    });
  });

  describe('prop: validationMode', () => {
    describe('onChange', () => {
      it('validates the field on change', async () => {
        await render(
          <Field.Root
            validationMode="onChange"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? 'error' : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>,
        );

        const control = screen.getByRole<HTMLInputElement>('textbox');
        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.change(control, { target: { value: 't' } });

        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });
    });

    describe('onBlur', () => {
      it('validates the field on blur', async () => {
        await render(
          <Field.Root
            validationMode="onBlur"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? 'error' : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>,
        );

        const control = screen.getByRole<HTMLInputElement>('textbox');
        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.change(control, { target: { value: 't' } });

        expect(control).not.to.have.attribute('data-invalid');

        fireEvent.blur(control);

        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });
    });

    describe('computed validity state', () => {
      it('should not mark field as invalid for valueMissing if not dirty', async () => {
        await render(
          <Field.Root>
            <Field.Control data-testid="control" required />
          </Field.Root>,
        );

        const control = screen.getByTestId('control');

        fireEvent.focus(control);
        fireEvent.blur(control);

        expect(control).not.to.have.attribute('data-invalid');
        expect(control).not.to.have.attribute('aria-invalid');
      });

      it('should mark field as invalid for valueMissing if dirty', async () => {
        await render(
          <Field.Root>
            <Field.Control data-testid="control" required />
          </Field.Root>,
        );

        const control = screen.getByTestId('control');

        // Mark as touched and dirtied
        fireEvent.focus(control);
        fireEvent.change(control, { target: { value: 'a' } });
        fireEvent.change(control, { target: { value: '' } });
        fireEvent.blur(control);

        // valueMissing is true, and markedDirtyRef is true, so valid should be false
        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });

      it('should mark field as invalid for other errors (e.g., typeMismatch) even if not dirty', async () => {
        await render(
          <Field.Root>
            <Field.Control data-testid="control" type="email" defaultValue="not_an_email@" />
          </Field.Root>,
        );

        const control = screen.getByTestId('control');

        // Mark as touched but not dirty
        fireEvent.focus(control);
        fireEvent.blur(control);

        // typeMismatch is true, so valid should be false regardless of dirty state
        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });
    });
  });

  describe('prop: validateDebounceTime', () => {
    const { clock, render: renderFakeTimers } = createRenderer();

    clock.withFakeTimers();

    it('should debounce validation', async () => {
      await renderFakeTimers(
        <Field.Root
          validationDebounceTime={100}
          validationMode="onChange"
          validate={(value) => {
            const str = value as string;
            return str.length < 3 ? 'error' : null;
          }}
        >
          <Field.Control />
          <Field.Error />
        </Field.Root>,
      );

      const control = screen.getByRole<HTMLInputElement>('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.change(control, { target: { value: 't' } });

      expect(control).not.to.have.attribute('aria-invalid');

      clock.tick(99);

      fireEvent.change(control, { target: { value: 'te' } });

      clock.tick(99);

      expect(control).not.to.have.attribute('aria-invalid');

      clock.tick(1);

      expect(control).to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByText('error')).not.to.equal(null);
    });
  });

  describe('revalidation', () => {
    it('revalidates on change for `valueMissing`', async () => {
      await render(
        <Field.Root>
          <Field.Control required />
          <Field.Error />
        </Field.Root>,
      );

      const control = screen.getByRole('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 't' } });
      fireEvent.blur(control);

      expect(control).not.to.have.attribute('aria-invalid', 'true');

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: '' } });
      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid');
    });

    it('handles both `required` and `typeMismatch`', async () => {
      await render(
        <Field.Root>
          <Field.Control type="email" required />
          <Field.Error data-testid="error" />
        </Field.Root>,
      );

      const control = screen.getByRole('textbox');
      const message = screen.queryByTestId('error');

      expect(message).to.equal(null);

      fireEvent.focus(control);
      fireEvent.blur(control);

      expect(control).not.to.have.attribute('aria-invalid');

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'tt' } });
      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid', 'true');

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: '' } });
      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid', 'true');

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'email@email.com' } });
      fireEvent.blur(control);

      expect(control).not.to.have.attribute('aria-invalid');
    });

    it('clears valueMissing on change but defers other native errors like typeMismatch until blur when both are active', async () => {
      await render(
        <Field.Root>
          <Field.Control type="email" required data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>,
      );

      const control = screen.getByTestId('control');

      fireEvent.focus(control);
      fireEvent.blur(control);
      expect(control).not.to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).to.equal(null);

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'a' } });
      fireEvent.change(control, { target: { value: '' } });
      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid', 'true');
      expect(screen.getByTestId('error')).not.to.equal(null);

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 't' } });

      // The field becomes temporarily valid because only 'valueMissing' is checked for immediate clearing.
      // Other errors like 'typeMismatch' are deferred to the next blur/submit.
      expect(control).not.to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).to.equal(null);

      fireEvent.blur(control);

      expect(control).to.have.attribute('aria-invalid', 'true');
      expect(screen.getByTestId('error')).not.to.equal(null);
      expect(screen.getByTestId('error').textContent).not.to.equal('');

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'test@example.com' } });

      expect(control).not.to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).to.equal(null);

      fireEvent.blur(control);

      expect(control).not.to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).to.equal(null);
    });
  });

  describe('style hooks', () => {
    describe('touched', () => {
      it('should apply [data-touched] style hook to all components when touched', async () => {
        await render(
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>,
        );

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');
        const error = screen.queryByTestId('error');

        expect(root).not.to.have.attribute('data-touched');
        expect(control).not.to.have.attribute('data-touched');
        expect(label).not.to.have.attribute('data-touched');
        expect(description).not.to.have.attribute('data-touched');
        expect(error).to.equal(null);

        fireEvent.focus(control);
        fireEvent.blur(control);

        expect(root).to.have.attribute('data-touched', '');
        expect(control).to.have.attribute('data-touched', '');
        expect(label).to.have.attribute('data-touched', '');
        expect(description).to.have.attribute('data-touched', '');
        expect(error).to.equal(null);
      });
    });

    describe('dirty', () => {
      it('should apply [data-dirty] style hook to all components when dirty', async () => {
        await render(
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>,
        );

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-dirty');
        expect(control).not.to.have.attribute('data-dirty');
        expect(label).not.to.have.attribute('data-dirty');
        expect(description).not.to.have.attribute('data-dirty');

        fireEvent.change(control, { target: { value: 'value' } });

        expect(root).to.have.attribute('data-dirty', '');
        expect(control).to.have.attribute('data-dirty', '');
        expect(label).to.have.attribute('data-dirty', '');
        expect(description).to.have.attribute('data-dirty', '');

        fireEvent.change(control, { target: { value: '' } });

        expect(root).not.to.have.attribute('data-dirty');
        expect(control).not.to.have.attribute('data-dirty');
        expect(label).not.to.have.attribute('data-dirty');
        expect(description).not.to.have.attribute('data-dirty');
      });
    });

    describe('filled', async () => {
      it('should apply [data-filled] style hook to all components when filled', async () => {
        await render(
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>,
        );

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-filled');
        expect(control).not.to.have.attribute('data-filled');
        expect(label).not.to.have.attribute('data-filled');
        expect(description).not.to.have.attribute('data-filled');

        fireEvent.change(control, { target: { value: 'value' } });

        expect(root).to.have.attribute('data-filled', '');
        expect(control).to.have.attribute('data-filled', '');
        expect(label).to.have.attribute('data-filled', '');
        expect(description).to.have.attribute('data-filled', '');

        fireEvent.change(control, { target: { value: '' } });

        expect(root).not.to.have.attribute('data-filled');
        expect(control).not.to.have.attribute('data-filled');
        expect(label).not.to.have.attribute('data-filled');
        expect(description).not.to.have.attribute('data-filled');
      });

      it('changes [data-filled] when the value is changed externally', async () => {
        function App() {
          const [value, setValue] = React.useState('');
          return (
            <div>
              <Field.Root>
                <Field.Control value={value} onChange={(event) => setValue(event.target.value)} />
              </Field.Root>
              <button onClick={() => setValue('test')}>change</button>
              <button onClick={() => setValue('')}>reset</button>
            </div>
          );
        }

        const { user } = await render(<App />);

        expect(screen.getByRole('textbox')).not.to.have.attribute('data-filled', '');

        await user.click(screen.getByRole('button', { name: 'change' }));
        expect(screen.getByRole('textbox')).to.have.attribute('data-filled', '');

        await user.click(screen.getByRole('button', { name: 'reset' }));
        expect(screen.getByRole('textbox')).not.to.have.attribute('data-filled', '');
      });
    });

    describe('focused', () => {
      it('should apply [data-focused] style hook to all components when focused', async () => {
        await render(
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>,
        );

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-focused');
        expect(control).not.to.have.attribute('data-focused');
        expect(label).not.to.have.attribute('data-focused');
        expect(description).not.to.have.attribute('data-focused');

        fireEvent.focus(control);

        expect(root).to.have.attribute('data-focused', '');
        expect(control).to.have.attribute('data-focused', '');
        expect(label).to.have.attribute('data-focused', '');
        expect(description).to.have.attribute('data-focused', '');

        fireEvent.blur(control);

        expect(root).not.to.have.attribute('data-focused');
        expect(control).not.to.have.attribute('data-focused');
        expect(label).not.to.have.attribute('data-focused');
        expect(description).not.to.have.attribute('data-focused');
      });
    });
  });
});
