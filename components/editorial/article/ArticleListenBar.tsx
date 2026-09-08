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
  Info,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  X,
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

function extractText(
  node: any
): string {
  if (!node) {
    return '';
  }

  if (
    node.type === 'text' &&
    typeof node.text === 'string'
  ) {
    return node.text;
  }

  if (
    node.type ===
    'hardBreak'
  ) {
    return '\n';
  }

  if (
    Array.isArray(node)
  ) {
    return node
      .map(extractText)
      .filter(Boolean)
      .join(' ');
  }

  if (
    Array.isArray(
      node.content
    )
  ) {
    const children =
      node.content
        .map(extractText)
        .filter(Boolean)
        .join(' ');

    if (
      [
        'paragraph',
        'heading',
        'blockquote',
        'listItem',
      ].includes(
        node.type
      )
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
  const cleaned =
    text
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (!cleaned) {
    return [];
  }

  const sentences =
    cleaned.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g
    ) ?? [
      cleaned,
    ];

  const segments:
    string[] = [];

  sentences.forEach(
    (sentence) => {
      const trimmed =
        sentence.trim();

      if (!trimmed) {
        return;
      }

      if (
        trimmed.length <=
        260
      ) {
        segments.push(
          trimmed
        );

        return;
      }

      const words =
        trimmed.split(
          ' '
        );

      let current =
        '';

      words.forEach(
        (word) => {
          const candidate =
            current
              ? `${current} ${word}`
              : word;

          if (
            candidate.length >
              220 &&
            current
          ) {
            segments.push(
              current
            );

            current =
              word;
          } else {
            current =
              candidate;
          }
        }
      );

      if (current) {
        segments.push(
          current
        );
      }
    }
  );

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
  const safe =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(
    2,
    '0'
  )}`;
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
        extractText(
          body
        )
          .replace(
            /\s+/g,
            ' '
          )
          .trim(),
      [
        body,
      ]
    );

  const segments =
    useMemo(
      () =>
        createSpeechSegments(
          articleText
        ),
      [
        articleText,
      ]
    );

  const totalWords =
    useMemo(
      () =>
        countWords(
          articleText
        ),
      [
        articleText,
      ]
    );

  const [
    isPlaying,
    setIsPlaying,
  ] =
    useState(
      false
    );

  const [
    currentSegment,
    setCurrentSegment,
  ] =
    useState(
      0
    );

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] =
    useState(
      0
    );

  const [
    speed,
    setSpeed,
  ] =
    useState(
      1
    );

  const [
    volume,
    setVolume,
  ] =
    useState(
      1
    );

  const [
    previousVolume,
    setPreviousVolume,
  ] =
    useState(
      1
    );

  const [
    volumeOpen,
    setVolumeOpen,
  ] =
    useState(
      false
    );

  const [
    infoOpen,
    setInfoOpen,
  ] =
    useState(
      false
    );

  const [
    supported,
    setSupported,
  ] =
    useState(
      true
    );

  const [
    voices,
    setVoices,
  ] =
    useState<
      SpeechSynthesisVoice[]
    >([]);

  const playingRef =
    useRef(
      false
    );

  const currentSegmentRef =
    useRef(
      0
    );

  const speedRef =
    useRef(
      1
    );

  const volumeRef =
    useRef(
      1
    );

  const segmentsRef =
    useRef(
      segments
    );

  const elapsedRef =
    useRef(
      0
    );

  const timerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  /* =======================================================
     DURATION
  ======================================================= */

  const baseDuration =
    totalWords > 0
      ? (
          totalWords /
          170
        ) *
        60
      : 0;

  const totalDuration =
    speed > 0
      ? baseDuration /
        speed
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
  }, [
    isPlaying,
  ]);

  useEffect(() => {
    currentSegmentRef.current =
      currentSegment;
  }, [
    currentSegment,
  ]);

  useEffect(() => {
    speedRef.current =
      speed;
  }, [
    speed,
  ]);

  useEffect(() => {
    volumeRef.current =
      volume;
  }, [
    volume,
  ]);

  useEffect(() => {
    segmentsRef.current =
      segments;
  }, [
    segments,
  ]);

  useEffect(() => {
    elapsedRef.current =
      elapsedSeconds;
  }, [
    elapsedSeconds,
  ]);

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
      setSupported(
        false
      );

      return;
    }

    function loadVoices() {
      setVoices(
        window
          .speechSynthesis
          .getVoices()
      );
    }

    loadVoices();

    window
      .speechSynthesis
      .addEventListener(
        'voiceschanged',
        loadVoices
      );

    return () => {
      window
        .speechSynthesis
        .removeEventListener(
          'voiceschanged',
          loadVoices
        );
    };
  }, []);

  /* =======================================================
     VOICE SELECTION
  ======================================================= */

  const getVoice =
    useCallback(
      () => {
        const language =
          locale ===
          'es'
            ? 'es'
            : 'en';

        return (
          voices.find(
            (
              voice
            ) =>
              voice.lang
                .toLowerCase()
                .startsWith(
                  language
                ) &&
              voice.default
          ) ??
          voices.find(
            (
              voice
            ) =>
              voice.lang
                .toLowerCase()
                .startsWith(
                  language
                )
          ) ??
          null
        );
      },
      [
        locale,
        voices,
      ]
    );

  /* =======================================================
     SPEAK SEGMENT
  ======================================================= */

  const speakSegment =
    useCallback(
      (
        index: number
      ) => {
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
          window
            .speechSynthesis
            .cancel();

          playingRef.current =
            false;

          setIsPlaying(
            false
          );

          return;
        }

        window
          .speechSynthesis
          .cancel();

        const utterance =
          new SpeechSynthesisUtterance(
            currentSegments[
              index
            ]
          );

        utterance.rate =
          speedRef.current;

        utterance.pitch =
          1;

        utterance.volume =
          volumeRef.current;

        utterance.lang =
          locale ===
          'es'
            ? 'es'
            : 'en';

        const voice =
          getVoice();

        if (voice) {
          utterance.voice =
            voice;
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

              setIsPlaying(
                false
              );

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

            speakSegment(
              next
            );
          };

        utterance.onerror =
          (
            event
          ) => {
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

            setIsPlaying(
              false
            );
          };

        window
          .speechSynthesis
          .speak(
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
    if (
      !isPlaying
    ) {
      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }

      return;
    }

    timerRef.current =
      setInterval(
        () => {
          setElapsedSeconds(
            (
              current
            ) => {
              const next =
                Math.min(
                  current +
                    1,
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
        },
        1000
      );

    return () => {
      if (
        timerRef.current
      ) {
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
        window
          .speechSynthesis
          ?.cancel();
      }

      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     RESTART CURRENT SPEECH SEGMENT
  ======================================================= */

  function restartCurrentSegment() {
    if (
      !isPlaying ||
      typeof window ===
        'undefined'
    ) {
      return;
    }

    window
      .speechSynthesis
      .cancel();

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

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  function togglePlayback() {
    if (
      !supported ||
      segments.length ===
        0
    ) {
      return;
    }

    if (
      isPlaying
    ) {
      window
        .speechSynthesis
        .cancel();

      playingRef.current =
        false;

      setIsPlaying(
        false
      );

      return;
    }

    let startIndex =
      currentSegmentRef.current;

    if (
      elapsedRef.current >=
      totalDuration
    ) {
      startIndex =
        0;

      setCurrentSegment(
        0
      );

      currentSegmentRef.current =
        0;

      setElapsedSeconds(
        0
      );

      elapsedRef.current =
        0;
    }

    playingRef.current =
      true;

    setIsPlaying(
      true
    );

    speakSegment(
      startIndex
    );
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

    setSpeed(
      value
    );

    speedRef.current =
      value;

    const nextTotal =
      value > 0
        ? baseDuration /
          value
        : baseDuration;

    const nextElapsed =
      currentProgress *
      nextTotal;

    setElapsedSeconds(
      nextElapsed
    );

    elapsedRef.current =
      nextElapsed;

    restartCurrentSegment();
  }

  /* =======================================================
     VOLUME
  ======================================================= */

  function changeVolume(
    value: number
  ) {
    const next =
      Math.min(
        Math.max(
          value,
          0
        ),
        1
      );

    setVolume(
      next
    );

    volumeRef.current =
      next;

    if (
      next > 0
    ) {
      setPreviousVolume(
        next
      );
    }

    restartCurrentSegment();
  }

  function toggleMute() {
    if (
      volume > 0
    ) {
      setPreviousVolume(
        volume
      );

      setVolume(
        0
      );

      volumeRef.current =
        0;
    } else {
      const restored =
        previousVolume >
        0
          ? previousVolume
          : 1;

      setVolume(
        restored
      );

      volumeRef.current =
        restored;
    }

    restartCurrentSegment();
  }

  const VolumeIcon =
    volume === 0
      ? VolumeX
      : volume < 0.5
        ? Volume1
        : Volume2;

  /* =======================================================
     SEEK
  ======================================================= */

  function seekToRatio(
    ratio: number
  ) {
    if (
      segments.length ===
      0
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
      window
        .speechSynthesis
        .cancel();

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
      event.currentTarget
        .getBoundingClientRect();

    const ratio =
      (
        event.clientX -
        rect.left
      ) /
      rect.width;

    seekToRatio(
      ratio
    );
  }

  /* =======================================================
     UNSUPPORTED BROWSER
  ======================================================= */

  if (
    !supported
  ) {
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
          {locale ===
          'es'
            ? 'Escuchar artículo'
            : 'Listen to article'}
        </p>

        <p
          className="
            mt-1
            font-body
            text-xs
            text-muted-foreground
          "
        >
          {locale ===
          'es'
            ? 'La reproducción de audio no es compatible con este navegador.'
            : 'Audio playback is not supported by this browser.'}
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
        py-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        {/* =================================================
            PLAY BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={
            togglePlayback
          }
          disabled={
            segments.length ===
            0
          }
          className="
            inline-flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-deep
            text-white
            transition-colors
            hover:bg-deep/90
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            disabled:pointer-events-none
            disabled:opacity-50
          "
          aria-label={
            isPlaying
              ? locale ===
                'es'
                ? 'Pausar'
                : 'Pause'
              : locale ===
                  'es'
                ? 'Reproducir'
                : 'Play'
          }
        >
          {isPlaying ? (
            <Pause
              className="
                h-4
                w-4
              "
              aria-hidden
            />
          ) : (
            <Play
              className="
                ml-0.5
                h-4
                w-4
              "
              aria-hidden
            />
          )}
        </button>

        {/* =================================================
            PLAYER CONTENT
        ================================================= */}

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
              justify-between
              gap-3
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
              {locale ===
              'es'
                ? 'Escuchar artículo'
                : 'Listen to article'}
            </p>

            <p
              className="
                shrink-0
                font-interface
                text-[11px]
                tabular-nums
                text-muted-foreground
              "
            >
              {formatTime(
                elapsedSeconds
              )}
              {' / '}
              {formatTime(
                totalDuration
              )}
            </p>
          </div>

          {/* =================================================
              PROGRESS + CONTROLS
          ================================================= */}

          <div
            className="
              mt-2
              flex
              items-center
              gap-2
            "
          >
            {/* Progress */}
            <div
              role="slider"
              aria-label={
                locale ===
                'es'
                  ? 'Progreso del audio'
                  : 'Audio progress'
              }
              aria-valuemin={
                0
              }
              aria-valuemax={
                100
              }
              aria-valuenow={Math.round(
                progress *
                  100
              )}
              tabIndex={
                0
              }
              onClick={
                handleProgressClick
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                    'ArrowRight' ||
                  event.key ===
                    'ArrowLeft'
                ) {
                  event.preventDefault();

                  const delta =
                    event.key ===
                    'ArrowRight'
                      ? 0.05
                      : -0.05;

                  seekToRatio(
                    progress +
                      delta
                  );
                }
              }}
              className="
                relative
                h-5
                min-w-0
                flex-1
                cursor-pointer
                focus-visible:outline-none
              "
            >
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-1/2
                  h-[3px]
                  -translate-y-1/2
                  rounded-full
                  bg-border
                "
              />

              <div
                className="
                  absolute
                  left-0
                  top-1/2
                  h-[3px]
                  -translate-y-1/2
                  rounded-full
                  bg-deep
                "
                style={{
                  width: `${progress * 100}%`,
                }}
              />

              <div
                className="
                  absolute
                  top-1/2
                  h-3
                  w-3
                  -translate-x-1/2
                  -translate-y-1/2
                  rounded-full
                  bg-deep
                "
                style={{
                  left: `${progress * 100}%`,
                }}
              />
            </div>

            {/* ===============================================
                SPEED
            =============================================== */}

            <div
              className="
                relative
                shrink-0
              "
            >
              <select
                value={
                  speed
                }
                onChange={(
                  event
                ) =>
                  changeSpeed(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
                }
                aria-label={
                  locale ===
                  'es'
                    ? 'Velocidad'
                    : 'Playback speed'
                }
                className="
                  h-9
                  cursor-pointer
                  appearance-none
                  rounded-md
                  border
                  border-border
                  bg-white
                  pl-3
                  pr-8
                  font-interface
                  text-xs
                  font-semibold
                  text-deep
                  outline-none
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                {SPEED_OPTIONS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option
                      }
                      value={
                        option
                      }
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
                  right-2.5
                  top-1/2
                  h-3.5
                  w-3.5
                  -translate-y-1/2
                  text-muted-foreground
                "
                aria-hidden
              />
            </div>

            {/* ===============================================
                VOLUME
            =============================================== */}

            <div
              className="
                relative
                shrink-0
              "
            >
              <button
                type="button"
                onClick={() => {
                  setVolumeOpen(
                    (
                      current
                    ) =>
                      !current
                  );

                  setInfoOpen(
                    false
                  );
                }}
                className="
                  inline-flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-md
                  border
                  border-border
                  bg-white
                  text-deep
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
                aria-label={
                  locale ===
                  'es'
                    ? 'Volumen'
                    : 'Volume'
                }
                aria-expanded={
                  volumeOpen
                }
              >
                <VolumeIcon
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>

              {volumeOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+0.5rem)]
                    z-30
                    w-48
                    rounded-lg
                    border
                    border-border
                    bg-white
                    p-3
                    shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        toggleMute
                      }
                      className="
                        inline-flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        text-deep
                        transition-colors
                        hover:bg-surface-muted
                      "
                      aria-label={
                        volume ===
                        0
                          ? locale ===
                            'es'
                            ? 'Activar sonido'
                            : 'Unmute'
                          : locale ===
                              'es'
                            ? 'Silenciar'
                            : 'Mute'
                      }
                    >
                      <VolumeIcon
                        className="
                          h-4
                          w-4
                        "
                        aria-hidden
                      />
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={
                        volume
                      }
                      onChange={(
                        event
                      ) =>
                        changeVolume(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                      className="
                        w-full
                        accent-deep
                      "
                      aria-label={
                        locale ===
                        'es'
                          ? 'Nivel de volumen'
                          : 'Volume level'
                      }
                    />
                  </div>

                  <p
                    className="
                      mt-2
                      text-center
                      font-interface
                      text-[11px]
                      text-muted-foreground
                    "
                  >
                    {Math.round(
                      volume *
                        100
                    )}
                    %
                  </p>
                </div>
              )}
            </div>

            {/* ===============================================
                INFO
            =============================================== */}

            <div
              className="
                relative
                shrink-0
              "
            >
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(
                    (
                      current
                    ) =>
                      !current
                  );

                  setVolumeOpen(
                    false
                  );
                }}
                className="
                  inline-flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-border
                  bg-white
                  text-deep
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
                aria-label={
                  locale ===
                  'es'
                    ? 'Información'
                    : 'Listen information'
                }
                aria-expanded={
                  infoOpen
                }
              >
                <Info
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>

              {infoOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+0.5rem)]
                    z-30
                    w-72
                    rounded-lg
                    border
                    border-border
                    bg-white
                    p-4
                    shadow-lg
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
                    "
                  >
                    <div>
                      <p
                        className="
                          font-interface
                          text-sm
                          font-semibold
                          text-deep
                        "
                      >
                        {locale ===
                        'es'
                          ? 'Acerca de Escuchar'
                          : 'About Listen'}
                      </p>

                      <p
                        className="
                          mt-2
                          font-body
                          text-xs
                          leading-5
                          text-muted-foreground
                        "
                      >
                        {locale ===
                        'es'
                          ? 'Esta función utiliza la voz disponible en tu navegador para leer el artículo en voz alta. La duración y el progreso son estimados.'
                          : 'This feature uses a voice available in your browser to read the article aloud. Duration and progress are estimates.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setInfoOpen(
                          false
                        )
                      }
                      className="
                        inline-flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-md
                        text-muted-foreground
                        transition-colors
                        hover:bg-surface-muted
                        hover:text-deep
                      "
                      aria-label={
                        locale ===
                        'es'
                          ? 'Cerrar'
                          : 'Close'
                      }
                    >
                      <X
                        className="
                          h-4
                          w-4
                        "
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}