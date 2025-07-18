import * as React from 'react';
import { expect } from 'chai';
import { act, createRenderer, fireEvent, flushMicrotasks } from '@mui/internal-test-utils';
import { isJSDOM } from '#test-utils';
import { DirectionProvider } from '../../direction-provider';
import { CompositeItem } from '../item/CompositeItem';
import { CompositeRoot } from './CompositeRoot';

describe('Composite', () => {
  const { render } = createRenderer();

  describe('list', () => {
    it('controlled mode', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = React.useState(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex}
            onHighlightedIndexChange={setHighlightedIndex}
          >
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>
        );
      }

      const { getByTestId } = render(<App />);

      const item1 = getByTestId('1');
      const item2 = getByTestId('2');
      const item3 = getByTestId('3');

      act(() => item1.focus());

      expect(item1).to.have.attribute('tabindex', '0');

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();

      fireEvent.keyDown(item3, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item1).to.have.attribute('tabindex', '0');
      expect(item1).toHaveFocus();
    });

    it('uncontrolled mode', async () => {
      const { getByTestId } = render(
        <CompositeRoot>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
          <CompositeItem data-testid="3">3</CompositeItem>
        </CompositeRoot>,
      );

      const item1 = getByTestId('1');
      const item2 = getByTestId('2');
      const item3 = getByTestId('3');

      act(() => item1.focus());

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();

      fireEvent.keyDown(item3, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item1).to.have.attribute('tabindex', '0');
      expect(item1).toHaveFocus();
    });

    describe('Home and End keys', () => {
      it('Home key moves focus to the first item', async () => {
        const { getByTestId } = render(
          <CompositeRoot enableHomeAndEndKeys>
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>,
        );

        const item1 = getByTestId('1');
        const item3 = getByTestId('3');

        act(() => item3.focus());

        fireEvent.keyDown(item3, { key: 'Home' });
        await flushMicrotasks();

        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();
      });

      it('End key moves focus to the last item', async () => {
        const { getByTestId } = render(
          <CompositeRoot enableHomeAndEndKeys>
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>,
        );

        const item1 = getByTestId('1');
        const item3 = getByTestId('3');

        act(() => item1.focus());

        fireEvent.keyDown(item1, { key: 'End' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });
    });

    describe.skipIf(isJSDOM)('rtl', () => {
      it('horizontal orientation', async () => {
        const { getByTestId } = render(
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot orientation="horizontal">
                <CompositeItem data-testid="1">1</CompositeItem>
                <CompositeItem data-testid="2">2</CompositeItem>
                <CompositeItem data-testid="3">3</CompositeItem>
              </CompositeRoot>
            </DirectionProvider>
          </div>,
        );

        const item1 = getByTestId('1');
        const item2 = getByTestId('2');
        const item3 = getByTestId('3');

        act(() => item1.focus());

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        fireEvent.keyDown(item1, { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();

        fireEvent.keyDown(item3, { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();

        // loop backward
        fireEvent.keyDown(item1, { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });

      it('both horizontal and vertical orientation', async () => {
        const { getByTestId } = render(
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot orientation="both">
                <CompositeItem data-testid="1">1</CompositeItem>
                <CompositeItem data-testid="2">2</CompositeItem>
                <CompositeItem data-testid="3">3</CompositeItem>
              </CompositeRoot>
            </DirectionProvider>
          </div>,
        );

        const item1 = getByTestId('1');
        const item2 = getByTestId('2');
        const item3 = getByTestId('3');

        act(() => item1.focus());

        fireEvent.keyDown(item1, { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();

        fireEvent.keyDown(item3, { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });
    });
  });

  describe('grid', () => {
    it('uniform 1x1 items', async () => {
      function App() {
        return (
          // 1 to 9 numpad
          <CompositeRoot cols={3} enableHomeAndEndKeys>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((i) => (
              <CompositeItem key={i} data-testid={i}>
                {i}
              </CompositeItem>
            ))}
          </CompositeRoot>
        );
      }

      const { getByTestId } = await render(<App />);

      act(() => getByTestId('1').focus());

      fireEvent.keyDown(getByTestId('1'), { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(getByTestId('4')).to.have.attribute('tabindex', '0');
      expect(getByTestId('4')).toHaveFocus();

      fireEvent.keyDown(getByTestId('4'), { key: 'ArrowRight' });
      await flushMicrotasks();

      expect(getByTestId('5')).to.have.attribute('tabindex', '0');
      expect(getByTestId('5')).toHaveFocus();

      fireEvent.keyDown(getByTestId('5'), { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(getByTestId('8')).to.have.attribute('tabindex', '0');
      expect(getByTestId('8')).toHaveFocus();

      fireEvent.keyDown(getByTestId('8'), { key: 'ArrowLeft' });
      await flushMicrotasks();

      expect(getByTestId('7')).to.have.attribute('tabindex', '0');
      expect(getByTestId('7')).toHaveFocus();

      fireEvent.keyDown(getByTestId('7'), { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(getByTestId('4')).to.have.attribute('tabindex', '0');
      expect(getByTestId('4')).toHaveFocus();

      act(() => getByTestId('9').focus());
      await flushMicrotasks();

      expect(getByTestId('9')).to.have.attribute('tabindex', '0');

      fireEvent.keyDown(getByTestId('9'), { key: 'Home' });
      await flushMicrotasks();

      expect(getByTestId('1')).to.have.attribute('tabindex', '0');

      fireEvent.keyDown(getByTestId('1'), { key: 'End' });
      await flushMicrotasks();

      expect(getByTestId('9')).to.have.attribute('tabindex', '0');
    });

    describe.skipIf(isJSDOM)('rtl', () => {
      it('horizontal orientation', async () => {
        const { getByTestId } = render(
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot cols={3} orientation="horizontal" enableHomeAndEndKeys>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((i) => (
                  <CompositeItem key={i} data-testid={i}>
                    {i}
                  </CompositeItem>
                ))}
              </CompositeRoot>
            </DirectionProvider>
          </div>,
        );

        act(() => getByTestId('1').focus());

        fireEvent.keyDown(getByTestId('1'), { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(getByTestId('2')).to.have.attribute('tabindex', '0');
        expect(getByTestId('2')).toHaveFocus();

        fireEvent.keyDown(getByTestId('2'), { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(getByTestId('3')).to.have.attribute('tabindex', '0');
        expect(getByTestId('3')).toHaveFocus();

        fireEvent.keyDown(getByTestId('3'), { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(getByTestId('4')).to.have.attribute('tabindex', '0');
        expect(getByTestId('4')).toHaveFocus();

        fireEvent.keyDown(getByTestId('4'), { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(getByTestId('5')).to.have.attribute('tabindex', '0');
        expect(getByTestId('5')).toHaveFocus();

        fireEvent.keyDown(getByTestId('5'), { key: 'Home' });
        await flushMicrotasks();

        expect(getByTestId('1')).to.have.attribute('tabindex', '0');

        fireEvent.keyDown(getByTestId('1'), { key: 'End' });
        await flushMicrotasks();

        expect(getByTestId('9')).to.have.attribute('tabindex', '0');
      });

      it('both horizontal and vertical orientation', async () => {
        const { getByTestId } = await render(
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot cols={3} orientation="both" enableHomeAndEndKeys>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((i) => (
                  <CompositeItem key={i} data-testid={i}>
                    {i}
                  </CompositeItem>
                ))}
              </CompositeRoot>
            </DirectionProvider>
          </div>,
        );

        act(() => getByTestId('1').focus());

        fireEvent.keyDown(getByTestId('1'), { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(getByTestId('4')).to.have.attribute('tabindex', '0');
        expect(getByTestId('4')).toHaveFocus();

        fireEvent.keyDown(getByTestId('4'), { key: 'ArrowLeft' });
        await flushMicrotasks();

        expect(getByTestId('5')).to.have.attribute('tabindex', '0');
        expect(getByTestId('5')).toHaveFocus();

        fireEvent.keyDown(getByTestId('5'), { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(getByTestId('8')).to.have.attribute('tabindex', '0');
        expect(getByTestId('8')).toHaveFocus();

        fireEvent.keyDown(getByTestId('8'), { key: 'ArrowRight' });
        await flushMicrotasks();

        expect(getByTestId('7')).to.have.attribute('tabindex', '0');
        expect(getByTestId('7')).toHaveFocus();

        fireEvent.keyDown(getByTestId('7'), { key: 'ArrowUp' });
        await flushMicrotasks();

        expect(getByTestId('4')).to.have.attribute('tabindex', '0');
        expect(getByTestId('4')).toHaveFocus();

        fireEvent.keyDown(getByTestId('4'), { key: 'End' });
        await flushMicrotasks();

        expect(getByTestId('9')).to.have.attribute('tabindex', '0');

        fireEvent.keyDown(getByTestId('9'), { key: 'Home' });
        await flushMicrotasks();

        expect(getByTestId('1')).to.have.attribute('tabindex', '0');
      });
    });

    describe('prop: disabledIndices', () => {
      it('disables navigating item when their index is included', async () => {
        function App() {
          const [highlightedIndex, setHighlightedIndex] = React.useState(0);
          return (
            <CompositeRoot
              highlightedIndex={highlightedIndex}
              onHighlightedIndexChange={setHighlightedIndex}
              disabledIndices={[1]}
            >
              <CompositeItem data-testid="1" />
              <CompositeItem data-testid="2" />
              <CompositeItem data-testid="3" />
            </CompositeRoot>
          );
        }

        const { getByTestId } = render(<App />);

        const item1 = getByTestId('1');
        const item3 = getByTestId('3');

        act(() => item1.focus());

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();

        fireEvent.keyDown(item3, { key: 'ArrowUp' });
        await flushMicrotasks();

        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();
      });

      it('allows navigating items disabled in the DOM when their index is excluded', async () => {
        function App() {
          const [highlightedIndex, setHighlightedIndex] = React.useState(0);
          return (
            <CompositeRoot
              highlightedIndex={highlightedIndex}
              onHighlightedIndexChange={setHighlightedIndex}
              disabledIndices={[]}
            >
              <CompositeItem
                data-testid="1"
                // TS doesn't like the disabled attribute on non-interactive elements
                // but testing library refuses to focus disabled interactive elements
                // @ts-ignore
                render={<span data-disabled aria-disabled="true" disabled />}
              />
              <CompositeItem
                data-testid="2"
                // @ts-ignore
                render={<span data-disabled aria-disabled="true" disabled />}
              />
              <CompositeItem
                data-testid="3"
                // @ts-ignore
                render={<span data-disabled aria-disabled="true" disabled />}
              />
            </CompositeRoot>
          );
        }

        const { getByTestId } = await render(<App />);

        const item1 = getByTestId('1');
        const item2 = getByTestId('2');
        const item3 = getByTestId('3');

        act(() => item1.focus());

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();

        fireEvent.keyDown(item2, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();

        fireEvent.keyDown(item3, { key: 'ArrowDown' });
        await flushMicrotasks();

        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();

        fireEvent.keyDown(item1, { key: 'ArrowUp' });
        await flushMicrotasks();

        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });
    });
  });

  describe('prop: disabledIndices', () => {
    it('disables navigating item when their index is included', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = React.useState(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex}
            onHighlightedIndexChange={setHighlightedIndex}
            disabledIndices={[1]}
          >
            <CompositeItem data-testid="1" />
            <CompositeItem data-testid="2" />
            <CompositeItem data-testid="3" />
          </CompositeRoot>
        );
      }

      const { getByTestId } = render(<App />);

      const item1 = getByTestId('1');
      const item3 = getByTestId('3');

      act(() => item1.focus());

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();

      fireEvent.keyDown(item3, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item1).to.have.attribute('tabindex', '0');
      expect(item1).toHaveFocus();
    });

    it('allows navigating items disabled in the DOM when their index is excluded', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = React.useState(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex}
            onHighlightedIndexChange={setHighlightedIndex}
            disabledIndices={[]}
          >
            <CompositeItem
              data-testid="1"
              // TS doesn't like the disabled attribute on non-interactive elements
              // but testing library refuses to focus disabled interactive elements
              // @ts-ignore
              render={<span data-disabled aria-disabled="true" disabled />}
            />
            <CompositeItem
              data-testid="2"
              // @ts-ignore
              render={<span data-disabled aria-disabled="true" disabled />}
            />
            <CompositeItem
              data-testid="3"
              // @ts-ignore
              render={<span data-disabled aria-disabled="true" disabled />}
            />
          </CompositeRoot>
        );
      }

      const { getByTestId } = await render(<App />);

      const item1 = getByTestId('1');
      const item2 = getByTestId('2');
      const item3 = getByTestId('3');

      act(() => item1.focus());

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();

      fireEvent.keyDown(item3, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item1).to.have.attribute('tabindex', '0');
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();
    });
  });

  describe('prop: modifierKeys', () => {
    it('prevents arrow key navigation when any modifier key is pressed by default', async () => {
      const { getByTestId } = render(
        <CompositeRoot>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
        </CompositeRoot>,
      );

      const item1 = getByTestId('1');

      act(() => item1.focus());

      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', shiftKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', ctrlKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', altKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', metaKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();
    });

    it('specifies allowed modifier keys that do not prevent arrow key navigation when pressed', async () => {
      const { getByTestId } = render(
        <CompositeRoot modifierKeys={['Alt', 'Meta']}>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
          <CompositeItem data-testid="3">3</CompositeItem>
        </CompositeRoot>,
      );

      const item1 = getByTestId('1');
      const item2 = getByTestId('2');
      const item3 = getByTestId('3');

      act(() => item1.focus());

      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', shiftKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', ctrlKey: true });
      await flushMicrotasks();
      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', altKey: true });
      await flushMicrotasks();
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowDown', metaKey: true });
      await flushMicrotasks();
      expect(item3).toHaveFocus();
    });
  });
});
