import * as React from 'react';
import { isElement } from '@floating-ui/utils/dom';
import { useTimeout } from '@base-ui-components/utils/useTimeout';
import { useLatestRef } from '@base-ui-components/utils/useLatestRef';
import { useEventCallback } from '@base-ui-components/utils/useEventCallback';
import { useIsoLayoutEffect } from '@base-ui-components/utils/useIsoLayoutEffect';
import { contains, getDocument, isMouseLikePointerType } from '../utils';

import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type {
  Delay,
  ElementProps,
  FloatingContext,
  FloatingRootContext,
  FloatingTreeType,
  OpenChangeReason,
  SafePolygonOptions,
} from '../types';
import { createAttribute } from '../utils/createAttribute';

const safePolygonIdentifier = createAttribute('safe-polygon');

export interface HandleCloseContext extends FloatingContext {
  onClose: () => void;
  tree?: FloatingTreeType | null;
  leave?: boolean;
}

export interface HandleClose {
  (context: HandleCloseContext): (event: MouseEvent) => void;
  __options?: SafePolygonOptions;
}

export function getDelay(
  value: UseHoverProps['delay'],
  prop: 'open' | 'close',
  pointerType?: PointerEvent['pointerType'],
) {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'function') {
    const result = value();
    if (typeof result === 'number') {
      return result;
    }
    return result?.[prop];
  }

  return value?.[prop];
}

function getRestMs(value: number | (() => number)) {
  if (typeof value === 'function') {
    return value();
  }
  return value;
}

export interface UseHoverProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean;
  /**
   * Accepts an event handler that runs on `mousemove` to control when the
   * floating element closes once the cursor leaves the reference element.
   * @default null
   */
  handleClose?: HandleClose | null;
  /**
   * Waits until the user’s cursor is at “rest” over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: number | (() => number);
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: Delay | (() => Delay);
  /**
   * Whether the logic only runs for mouse input, ignoring touch input.
   * Note: due to a bug with Linux Chrome, "pen" inputs are considered "mouse".
   * @default false
   */
  mouseOnly?: boolean;
  /**
   * Whether moving the cursor over the floating element will open it, without a
   * regular hover event required.
   * @default true
   */
  move?: boolean;
}

/**
 * Opens the floating element while hovering over the reference element, like
 * CSS `:hover`.
 * @see https://floating-ui.com/docs/useHover
 */
export function useHover(context: FloatingRootContext, props: UseHoverProps = {}): ElementProps {
  const { open, onOpenChange, dataRef, events, elements } = context;
  const {
    enabled = true,
    delay = 0,
    handleClose = null,
    mouseOnly = false,
    restMs = 0,
    move = true,
  } = props;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();
  const handleCloseRef = useLatestRef(handleClose);
  const delayRef = useLatestRef(delay);
  const openRef = useLatestRef(open);
  const restMsRef = useLatestRef(restMs);

  const pointerTypeRef = React.useRef<string>(undefined);
  const timeout = useTimeout();
  const handlerRef = React.useRef<(event: MouseEvent) => void>(undefined);
  const restTimeout = useTimeout();
  const blockMouseMoveRef = React.useRef(true);
  const performedPointerEventsMutationRef = React.useRef(false);
  const unbindMouseMoveRef = React.useRef(() => {});
  const restTimeoutPendingRef = React.useRef(false);

  const isHoverOpen = useEventCallback(() => {
    const type = dataRef.current.openEvent?.type;
    return type?.includes('mouse') && type !== 'mousedown';
  });

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function onOpenChangeLocal({ open: newOpen }: { open: boolean }) {
      if (!newOpen) {
        timeout.clear();
        restTimeout.clear();
        blockMouseMoveRef.current = true;
        restTimeoutPendingRef.current = false;
      }
    }

    events.on('openchange', onOpenChangeLocal);
    return () => {
      events.off('openchange', onOpenChangeLocal);
    };
  }, [enabled, events, timeout, restTimeout]);

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    if (!handleCloseRef.current) {
      return undefined;
    }
    if (!open) {
      return undefined;
    }

    function onLeave(event: MouseEvent) {
      if (isHoverOpen()) {
        onOpenChange(false, event, 'hover');
      }
    }

    const html = getDocument(elements.floating).documentElement;
    html.addEventListener('mouseleave', onLeave);
    return () => {
      html.removeEventListener('mouseleave', onLeave);
    };
  }, [elements.floating, open, onOpenChange, enabled, handleCloseRef, isHoverOpen]);

  const closeWithDelay = React.useCallback(
    (event: Event, runElseBranch = true, reason: OpenChangeReason = 'hover') => {
      const closeDelay = getDelay(delayRef.current, 'close', pointerTypeRef.current);
      if (closeDelay && !handlerRef.current) {
        timeout.start(closeDelay, () => onOpenChange(false, event, reason));
      } else if (runElseBranch) {
        timeout.clear();
        onOpenChange(false, event, reason);
      }
    },
    [delayRef, onOpenChange, timeout],
  );

  const cleanupMouseMoveHandler = useEventCallback(() => {
    unbindMouseMoveRef.current();
    handlerRef.current = undefined;
  });

  const clearPointerEvents = useEventCallback(() => {
    if (performedPointerEventsMutationRef.current) {
      const body = getDocument(elements.floating).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      performedPointerEventsMutationRef.current = false;
    }
  });

  const isClickLikeOpenEvent = useEventCallback(() => {
    return dataRef.current.openEvent
      ? ['click', 'mousedown'].includes(dataRef.current.openEvent.type)
      : false;
  });

  // Registering the mouse events on the reference directly to bypass React's
  // delegation system. If the cursor was on a disabled element and then entered
  // the reference (no gap), `mouseenter` doesn't fire in the delegation system.
  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function onReferenceMouseEnter(event: MouseEvent) {
      timeout.clear();
      blockMouseMoveRef.current = false;

      if (
        (mouseOnly && !isMouseLikePointerType(pointerTypeRef.current)) ||
        (getRestMs(restMsRef.current) > 0 && !getDelay(delayRef.current, 'open'))
      ) {
        return;
      }

      const openDelay = getDelay(delayRef.current, 'open', pointerTypeRef.current);

      if (openDelay) {
        timeout.start(openDelay, () => {
          if (!openRef.current) {
            onOpenChange(true, event, 'hover');
          }
        });
      } else if (!open) {
        onOpenChange(true, event, 'hover');
      }
    }

    function onReferenceMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent()) {
        clearPointerEvents();
        return;
      }

      unbindMouseMoveRef.current();

      const doc = getDocument(elements.floating);
      restTimeout.clear();
      restTimeoutPendingRef.current = false;

      if (handleCloseRef.current && dataRef.current.floatingContext) {
        // Prevent clearing `onScrollMouseLeave` timeout.
        if (!open) {
          timeout.clear();
        }

        handlerRef.current = handleCloseRef.current({
          ...dataRef.current.floatingContext,
          tree,
          x: event.clientX,
          y: event.clientY,
          onClose() {
            clearPointerEvents();
            cleanupMouseMoveHandler();
            if (!isClickLikeOpenEvent()) {
              closeWithDelay(event, true, 'safe-polygon');
            }
          },
        });

        const handler = handlerRef.current;

        doc.addEventListener('mousemove', handler);
        unbindMouseMoveRef.current = () => {
          doc.removeEventListener('mousemove', handler);
        };

        return;
      }

      // Allow interactivity without `safePolygon` on touch devices. With a
      // pointer, a short close delay is an alternative, so it should work
      // consistently.
      const shouldClose =
        pointerTypeRef.current === 'touch'
          ? !contains(elements.floating, event.relatedTarget as Element | null)
          : true;
      if (shouldClose) {
        closeWithDelay(event);
      }
    }

    // Ensure the floating element closes after scrolling even if the pointer
    // did not move.
    // https://github.com/floating-ui/floating-ui/discussions/1692
    function onScrollMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent()) {
        return;
      }
      if (!dataRef.current.floatingContext) {
        return;
      }

      handleCloseRef.current?.({
        ...dataRef.current.floatingContext,
        tree,
        x: event.clientX,
        y: event.clientY,
        onClose() {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event);
          }
        },
      })(event);
    }

    function onFloatingMouseEnter() {
      timeout.clear();
    }

    function onFloatingMouseLeave(event: MouseEvent) {
      if (!isClickLikeOpenEvent()) {
        closeWithDelay(event, false);
      }
    }

    if (isElement(elements.domReference)) {
      const reference = elements.domReference as unknown as HTMLElement;
      const floating = elements.floating;

      if (open) {
        reference.addEventListener('mouseleave', onScrollMouseLeave);
      }

      if (move) {
        reference.addEventListener('mousemove', onReferenceMouseEnter, {
          once: true,
        });
      }

      reference.addEventListener('mouseenter', onReferenceMouseEnter);
      reference.addEventListener('mouseleave', onReferenceMouseLeave);

      if (floating) {
        floating.addEventListener('mouseleave', onScrollMouseLeave);
        floating.addEventListener('mouseenter', onFloatingMouseEnter);
        floating.addEventListener('mouseleave', onFloatingMouseLeave);
      }

      return () => {
        if (open) {
          reference.removeEventListener('mouseleave', onScrollMouseLeave);
        }

        if (move) {
          reference.removeEventListener('mousemove', onReferenceMouseEnter);
        }

        reference.removeEventListener('mouseenter', onReferenceMouseEnter);
        reference.removeEventListener('mouseleave', onReferenceMouseLeave);

        if (floating) {
          floating.removeEventListener('mouseleave', onScrollMouseLeave);
          floating.removeEventListener('mouseenter', onFloatingMouseEnter);
          floating.removeEventListener('mouseleave', onFloatingMouseLeave);
        }
      };
    }

    return undefined;
  }, [
    elements,
    enabled,
    context,
    mouseOnly,
    move,
    closeWithDelay,
    cleanupMouseMoveHandler,
    clearPointerEvents,
    onOpenChange,
    open,
    openRef,
    tree,
    delayRef,
    handleCloseRef,
    dataRef,
    isClickLikeOpenEvent,
    restMsRef,
    timeout,
    restTimeout,
  ]);

  // Block pointer-events of every element other than the reference and floating
  // while the floating element is open and has a `handleClose` handler. Also
  // handles nested floating elements.
  // https://github.com/floating-ui/floating-ui/issues/1722
  useIsoLayoutEffect(() => {
    if (!enabled) {
      return undefined;
    }

    // eslint-disable-next-line no-underscore-dangle
    if (open && handleCloseRef.current?.__options?.blockPointerEvents && isHoverOpen()) {
      performedPointerEventsMutationRef.current = true;
      const floatingEl = elements.floating;

      if (isElement(elements.domReference) && floatingEl) {
        const body = getDocument(elements.floating).body;
        body.setAttribute(safePolygonIdentifier, '');

        const ref = elements.domReference as unknown as HTMLElement | SVGSVGElement;

        const parentFloating = tree?.nodesRef.current.find((node) => node.id === parentId)?.context
          ?.elements.floating;

        if (parentFloating) {
          parentFloating.style.pointerEvents = '';
        }

        body.style.pointerEvents = 'none';
        ref.style.pointerEvents = 'auto';
        floatingEl.style.pointerEvents = 'auto';

        return () => {
          body.style.pointerEvents = '';
          ref.style.pointerEvents = '';
          floatingEl.style.pointerEvents = '';
        };
      }
    }

    return undefined;
  }, [enabled, open, parentId, elements, tree, handleCloseRef, isHoverOpen]);

  useIsoLayoutEffect(() => {
    if (!open) {
      pointerTypeRef.current = undefined;
      restTimeoutPendingRef.current = false;
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  }, [open, cleanupMouseMoveHandler, clearPointerEvents]);

  React.useEffect(() => {
    return () => {
      cleanupMouseMoveHandler();
      timeout.clear();
      restTimeout.clear();
      clearPointerEvents();
    };
  }, [
    enabled,
    elements.domReference,
    cleanupMouseMoveHandler,
    clearPointerEvents,
    timeout,
    restTimeout,
  ]);

  const reference: ElementProps['reference'] = React.useMemo(() => {
    function setPointerRef(event: React.PointerEvent) {
      pointerTypeRef.current = event.pointerType;
    }

    return {
      onPointerDown: setPointerRef,
      onPointerEnter: setPointerRef,
      onMouseMove(event) {
        const { nativeEvent } = event;

        function handleMouseMove() {
          if (!blockMouseMoveRef.current && !openRef.current) {
            onOpenChange(true, nativeEvent, 'hover');
          }
        }

        if (mouseOnly && !isMouseLikePointerType(pointerTypeRef.current)) {
          return;
        }

        if (open || getRestMs(restMsRef.current) === 0) {
          return;
        }

        // Ignore insignificant movements to account for tremors.
        if (restTimeoutPendingRef.current && event.movementX ** 2 + event.movementY ** 2 < 2) {
          return;
        }

        restTimeout.clear();

        if (pointerTypeRef.current === 'touch') {
          handleMouseMove();
        } else {
          restTimeoutPendingRef.current = true;
          restTimeout.start(getRestMs(restMsRef.current), handleMouseMove);
        }
      },
    };
  }, [mouseOnly, onOpenChange, open, openRef, restMsRef, restTimeout]);

  return React.useMemo(() => (enabled ? { reference } : {}), [enabled, reference]);
}
