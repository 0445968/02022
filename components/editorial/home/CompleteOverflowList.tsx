'use client';

import {
  Children,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface CompleteOverflowListProps {
  children: ReactNode;
}

export function CompleteOverflowList({
  children,
}: CompleteOverflowListProps) {
  const items = useMemo(
    () =>
      Children.toArray(
        children
      ),
    [children]
  );

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const itemRefs =
    useRef<
      Array<HTMLDivElement | null>
    >([]);

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(
    items.length
  );

  useLayoutEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const containerElement =
      container;

    function measure() {
      const containerBottom =
        containerElement
          .getBoundingClientRect()
          .bottom;

      let nextVisibleCount =
        items.length;

      for (
        let index = 0;
        index <
        itemRefs.current.length;
        index += 1
      ) {
        const item =
          itemRefs.current[
            index
          ];

        if (
          item &&
          item
            .getBoundingClientRect()
            .bottom >
            containerBottom +
              0.5
        ) {
          nextVisibleCount =
            index;

          break;
        }
      }

      setVisibleCount(
        nextVisibleCount
      );
    }

    measure();

    const resizeObserver =
      new ResizeObserver(
        measure
      );

    resizeObserver.observe(
      containerElement
    );

    return () =>
      resizeObserver.disconnect();
  }, [items]);

  return (
    <div
      ref={containerRef}
      className="
        xl:h-full
        xl:overflow-hidden
      "
    >
      {items.map(
        (
          item,
          index
        ) => (
          <div
            // The ordered editor positions are stable here.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            ref={(node) => {
              itemRefs.current[
                index
              ] = node;
            }}
            className={
              index === 1
                ? 'mt-4'
                : ''
            }
            style={{
              visibility:
                index <
                visibleCount
                  ? 'visible'
                  : 'hidden',
            }}
            aria-hidden={
              index >=
              visibleCount
            }
          >
            {item}
          </div>
        )
      )}
    </div>
  );
}