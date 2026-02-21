import * as React from "react";

type UseCompositionHandlers<T extends HTMLElement> = {
  onKeyDown?: (e: React.KeyboardEvent<T>) => void;
  onCompositionStart?: (e: React.CompositionEvent<T>) => void;
  onCompositionEnd?: (e: React.CompositionEvent<T>) => void;
};

export function useComposition<T extends HTMLElement>(
  handlers: UseCompositionHandlers<T>
) {
  const isComposingRef = React.useRef(false);

  const onCompositionStart = React.useCallback(
    (e: React.CompositionEvent<T>) => {
      isComposingRef.current = true;
      handlers.onCompositionStart?.(e);
    },
    [handlers]
  );

  const onCompositionEnd = React.useCallback(
    (e: React.CompositionEvent<T>) => {
      // keep true for this tick (Safari/IME edge cases)
      queueMicrotask(() => {
        isComposingRef.current = false;
      });
      handlers.onCompositionEnd?.(e);
    },
    [handlers]
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<T>) => {
      // Pass through; your Input component decides whether to block Enter.
      handlers.onKeyDown?.(e);
    },
    [handlers]
  );

  return { onCompositionStart, onCompositionEnd, onKeyDown };
}