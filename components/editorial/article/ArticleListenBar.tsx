'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ChevronDown,
  Pause,
  Play,
  Volume2,
} from 'lucide-react';

import type { Locale } from '@/types';

const SPEED_OPTIONS = [
  0.75,
  1,
  1.25,
  1.5,
  1.75,
  2,
];

interface ArticleListenBarProps {
  body: unknown;
  locale: Locale;
}

/* =========================================================
   EXTRACT ARTICLE TEXT
========================================================= */

function extractText(node: any): string {
  if (!node) {
    return '';
  }

  if (
    node.type === 'text' &&
    typeof node.text === 'string'
  ) {
    return node.text;
  }

  if (node.type === 'hardBreak') {
    return '\n';
  }

  if (Array.isArray(node)) {
    return node
      .map(extractText)
      .filter(Boolean)
      .join(' ');
  }

  if (Array.isArray(node.content)) {
    const children = node.content
      .map(extractText)
      .filter(Boolean)
      .join(' ');

    if (
      [
        'paragraph',
        'heading',
        'blockquote',
        'listItem',
      ].includes(node.type)
    ) {
      return `${children}\n`;
    }

    return children;
  }

  return '';
}

/* =========================================================
   CREATE SPEECH SEGMENTS
========================================================= */

function createSpeechSegments(
  text: string
) {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return [];
  }

  const sentences =
    cleaned.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    ) ?? [cleaned];

  const segments: string[] = [];

  sentences.forEach((sentence) => {
    const trimmed =
      sentence.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.length <= 260) {
      segments.push(trimmed);
      return;
    }

    const words =
      trimmed.split(' ');

    let current = '';

    words.forEach((word) => {
      const candidate =
        current
          ? `${current} ${word}`
          : word;

      if (
        candidate.length > 220 &&
        current
      ) {
        segments.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });

    if (current) {
      segments.push(current);
    }
  });

  return segments;
}

/* =========================================================
   HELPERS
========================================================= */

function countWords(
  value: string
) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function formatTime(
  seconds: number
) {
  const safe = Math.max(
    0,
    Math.floor(seconds)
  );

  const minutes = Math.floor(
    safe / 60
  );

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(2, '0')}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export function ArticleListenBar({
  body,
  locale,
}: ArticleListenBarProps) {
  const articleText =
    useMemo(
      () =>
        extractText(body)
          .replace(/\s+/g, ' ')
          .trim(),
      [body]
    );

  const segments =
    useMemo(
      () =>
        createSpeechSegments(
          articleText
        ),
      [articleText]
    );

  const totalWords =
    useMemo(
      () =>
        countWords(
          articleText
        ),
      [articleText]
    );

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false);

  const [
    currentSegment,
    setCurrentSegment,
  ] = useState(0);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    speed,
    setSpeed,
  ] = useState(1);

  const [
    supported,
    setSupported,
  ] = useState(true);

  const [
    voices,
    setVoices,
  ] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const playingRef =
    useRef(false);

  const currentSegmentRef =
    useRef(0);

  const speedRef =
    useRef(1);

  const segmentsRef =
    useRef(segments);

  const elapsedRef =
    useRef(0);

  const timerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  /* =======================================================
     DURATION
  ======================================================= */

  const baseDuration =
    totalWords > 0
      ? (totalWords / 170) * 60
      : 0;

  const totalDuration =
    speed > 0
      ? baseDuration / speed
      : baseDuration;

  const progress =
    totalDuration > 0
      ? Math.min(
          elapsedSeconds /
            totalDuration,
          1
        )
      : 0;

  /* =======================================================
     KEEP REFS CURRENT
  ======================================================= */

  useEffect(() => {
    playingRef.current =
      isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentSegmentRef.current =
      currentSegment;
  }, [currentSegment]);

  useEffect(() => {
    speedRef.current =
      speed;
  }, [speed]);

  useEffect(() => {
    segmentsRef.current =
      segments;
  }, [segments]);

  useEffect(() => {
    elapsedRef.current =
      elapsedSeconds;
  }, [elapsedSeconds]);

  /* =======================================================
     SPEECH SUPPORT + VOICES
  ======================================================= */

  useEffect(() => {
    if (
      typeof window ===
        'undefined' ||
      !(
        'speechSynthesis' in
        window
      )
    ) {
      setSupported(false);
      return;
    }

    function loadVoices() {
      setVoices(
        window.speechSynthesis
          .getVoices()
      );
    }

    loadVoices();

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        loadVoices
      );
    };
  }, []);

  /* =======================================================
     VOICE SELECTION
  ======================================================= */

  const getVoice =
    useCallback(() => {
      const language =
        locale === 'es'
          ? 'es'
          : 'en';

      return (
        voices.find(
          (voice) =>
            voice.lang
              .toLowerCase()
              .startsWith(
                language
              ) &&
            voice.default
        ) ??
        voices.find(
          (voice) =>
            voice.lang
              .toLowerCase()
              .startsWith(
                language
              )
        ) ??
        null
      );
    }, [
      locale,
      voices,
    ]);

  /* =======================================================
     SPEAK SEGMENT
  ======================================================= */

  const speakSegment =
    useCallback(
      (index: number) => {
        if (
          typeof window ===
            'undefined' ||
          !window
            .speechSynthesis
        ) {
          return;
        }

        const currentSegments =
          segmentsRef.current;

        if (
          index < 0 ||
          index >=
            currentSegments.length
        ) {
          window.speechSynthesis.cancel();

          playingRef.current =
            false;

          setIsPlaying(false);

          return;
        }

        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(
            currentSegments[index]
          );

        utterance.rate =
          speedRef.current;

        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.lang =
          locale === 'es'
            ? 'es'
            : 'en';

        const voice =
          getVoice();

        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart =
          () => {
            setCurrentSegment(
              index
            );

            currentSegmentRef.current =
              index;
          };

        utterance.onend =
          () => {
            if (
              !playingRef.current
            ) {
              return;
            }

            const next =
              index + 1;

            if (
              next >=
              currentSegments.length
            ) {
              playingRef.current =
                false;

              setIsPlaying(false);

              setElapsedSeconds(
                totalDuration
              );

              elapsedRef.current =
                totalDuration;

              return;
            }

            setCurrentSegment(
              next
            );

            currentSegmentRef.current =
              next;

            speakSegment(next);
          };

        utterance.onerror =
          (event) => {
            if (
              event.error ===
                'canceled' ||
              event.error ===
                'interrupted'
            ) {
              return;
            }

            console.error(
              'Article speech error:',
              event.error
            );

            playingRef.current =
              false;

            setIsPlaying(false);
          };

        window.speechSynthesis.speak(
          utterance
        );
      },
      [
        getVoice,
        locale,
        totalDuration,
      ]
    );

  /* =======================================================
     SECOND-BY-SECOND TIMER
  ======================================================= */

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }

      return;
    }

    timerRef.current =
      setInterval(() => {
        setElapsedSeconds(
          (current) => {
            const next =
              Math.min(
                current + 1,
                totalDuration
              );

            elapsedRef.current =
              next;

            if (
              next >=
              totalDuration
            ) {
              playingRef.current =
                false;

              setIsPlaying(
                false
              );
            }

            return next;
          }
        );
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }
    };
  }, [
    isPlaying,
    totalDuration,
  ]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        typeof window !==
        'undefined'
      ) {
        window.speechSynthesis?.cancel();
      }

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  function togglePlayback() {
    if (
      !supported ||
      segments.length === 0
    ) {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();

      playingRef.current =
        false;

      setIsPlaying(false);

      return;
    }

    let startIndex =
      currentSegmentRef.current;

    if (
      elapsedRef.current >=
      totalDuration
    ) {
      startIndex = 0;

      setCurrentSegment(0);

      currentSegmentRef.current =
        0;

      setElapsedSeconds(0);

      elapsedRef.current = 0;
    }

    playingRef.current =
      true;

    setIsPlaying(true);

    speakSegment(startIndex);
  }

  /* =======================================================
     SPEED
  ======================================================= */

  function changeSpeed(
    value: number
  ) {
    const previousTotal =
      totalDuration;

    const currentProgress =
      previousTotal > 0
        ? elapsedRef.current /
          previousTotal
        : 0;

    setSpeed(value);

    speedRef.current =
      value;

    const nextTotal =
      value > 0
        ? baseDuration / value
        : baseDuration;

    const nextElapsed =
      currentProgress *
      nextTotal;

    setElapsedSeconds(
      nextElapsed
    );

    elapsedRef.current =
      nextElapsed;

    if (
      isPlaying &&
      typeof window !==
        'undefined'
    ) {
      window.speechSynthesis.cancel();

      window.setTimeout(
        () => {
          if (
            playingRef.current
          ) {
            speakSegment(
              currentSegmentRef.current
            );
          }
        },
        60
      );
    }
  }

  /* =======================================================
     SEEK
  ======================================================= */

  function seekToRatio(
    ratio: number
  ) {
    if (
      segments.length === 0
    ) {
      return;
    }

    const clamped =
      Math.min(
        Math.max(
          ratio,
          0
        ),
        0.999999
      );

    const nextElapsed =
      clamped *
      totalDuration;

    const targetSegment =
      Math.floor(
        clamped *
          segments.length
      );

    setElapsedSeconds(
      nextElapsed
    );

    elapsedRef.current =
      nextElapsed;

    setCurrentSegment(
      targetSegment
    );

    currentSegmentRef.current =
      targetSegment;

    if (
      isPlaying &&
      typeof window !==
        'undefined'
    ) {
      window.speechSynthesis.cancel();

      window.setTimeout(
        () => {
          if (
            playingRef.current
          ) {
            speakSegment(
              targetSegment
            );
          }
        },
        60
      );
    }
  }

  function handleProgressClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const ratio =
      (event.clientX -
        rect.left) /
      rect.width;

    seekToRatio(ratio);
  }

  /* =======================================================
     UNSUPPORTED BROWSER
  ======================================================= */

  if (!supported) {
    return (
      <section
        className="
          mb-8
          bg-white
          py-4
        "
      >
        <p
          className="
            font-interface
            text-sm
            font-semibold
            text-deep
          "
        >
          Listen to article
        </p>

        <p
          className="
            mt-1
            font-body
            text-xs
            text-muted-foreground
          "
        >
          Audio playback is not
          supported by this browser.
        </p>
      </section>
    );
  }

  /* =======================================================
     PLAYER
  ======================================================= */

  return (
    <section
      className="
        mb-8
        bg-white
        py-4
      "
    >
      {/* ==================================================
          TOP ROW
      ================================================== */}

      <div
        className="
          flex
          items-center
          gap-4
        "
      >
        {/* Play */}
        <button
          type="button"
          onClick={
            togglePlayback
          }
          disabled={
            segments.length === 0
          }
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-[hsl(var(--color-article-accent))]
            text-white
            transition-opacity
            hover:opacity-90
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          aria-label={
            isPlaying
              ? 'Pause article'
              : 'Listen to article'
          }
        >
          {isPlaying ? (
            <Pause
              className="
                h-4
                w-4
                fill-current
              "
              aria-hidden
            />
          ) : (
            <Play
              className="
                ml-0.5
                h-4
                w-4
                fill-current
              "
              aria-hidden
            />
          )}
        </button>

        {/* Label */}
        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <Volume2
              className="
                h-4
                w-4
                shrink-0
                text-[hsl(var(--color-article-accent))]
              "
              aria-hidden
            />

            <p
              className="
                font-interface
                text-sm
                font-semibold
                text-deep
              "
            >
              Listen to article
            </p>
          </div>

          <p
            className="
              mt-0.5
              font-interface
              text-[0.68rem]
              text-muted-foreground
            "
          >
            {formatTime(
              totalDuration
            )}{' '}
            listen
          </p>
        </div>

        {/* ==================================================
            SPEED SELECT
        ================================================== */}

        <div
          className="
            relative
            shrink-0
          "
        >
          <label
            htmlFor="article-playback-speed"
            className="sr-only"
          >
            Playback speed
          </label>

          <select
            id="article-playback-speed"
            value={speed}
            onChange={(event) =>
              changeSpeed(
                Number(
                  event.target
                    .value
                )
              )
            }
            className="
              h-9
              cursor-pointer
              appearance-none
              rounded-lg
              border-0
              bg-white
              pl-3
              pr-10
              font-interface
              text-xs
              font-semibold
              text-deep
              shadow-sm
              outline-none
              ring-1
              ring-border
              transition-colors
              hover:bg-surface-muted
              focus:ring-2
              focus:ring-[hsl(var(--color-article-accent))]
            "
          >
            {SPEED_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}x
                </option>
              )
            )}
          </select>

          <ChevronDown
            className="
              pointer-events-none
              absolute
              right-3.5
              top-1/2
              h-4
              w-4
              -translate-y-1/2
              text-deep
            "
            aria-hidden
          />
        </div>
      </div>

      {/* ==================================================
          PROGRESS BAR
      ================================================== */}

      <div
        className="
          mt-4
          flex
          items-center
          gap-3
        "
      >
        {/* Current time */}
        <span
          className="
            w-9
            shrink-0
            font-interface
            text-[0.65rem]
            tabular-nums
            text-muted-foreground
          "
        >
          {formatTime(
            elapsedSeconds
          )}
        </span>

        {/* Seek bar */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Article playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(
            progress * 100
          )}
          onClick={
            handleProgressClick
          }
          onKeyDown={(event) => {
            if (
              event.key ===
              'ArrowRight'
            ) {
              event.preventDefault();

              seekToRatio(
                progress + 0.05
              );
            }

            if (
              event.key ===
              'ArrowLeft'
            ) {
              event.preventDefault();

              seekToRatio(
                progress - 0.05
              );
            }
          }}
          className="
            group
            relative
            h-6
            min-w-0
            flex-1
            cursor-pointer
            outline-none
          "
        >
          {/* Track */}
          <div
            className="
              absolute
              left-0
              right-0
              top-1/2
              h-1.5
              -translate-y-1/2
              overflow-hidden
              rounded-full
              bg-deep/10
              transition-[height]
              group-hover:h-2
              group-focus-visible:h-2
            "
          >
            {/* Filled progress */}
            <div
              className="
                h-full
                rounded-full
                bg-[hsl(var(--color-article-accent))]
              "
              style={{
                width: `${
                  progress * 100
                }%`,
              }}
            />
          </div>

          {/* Seek handle */}
          <span
            className="
              absolute
              top-1/2
              h-3
              w-3
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-[hsl(var(--color-article-accent))]
              opacity-0
              shadow-sm
              transition-opacity
              group-hover:opacity-100
              group-focus-visible:opacity-100
            "
            style={{
              left: `${
                progress * 100
              }%`,
            }}
            aria-hidden
          />
        </div>

        {/* Total */}
        <span
          className="
            w-9
            shrink-0
            text-right
            font-interface
            text-[0.65rem]
            tabular-nums
            text-muted-foreground
          "
        >
          {formatTime(
            totalDuration
          )}
        </span>
      </div>
    </section>
  );
}