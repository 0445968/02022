import {
    createStoryTextSnapshot,
    diffText,
  } from '@/lib/editorial/story-diff';
  
  import type {
    StoryWithRelations,
  } from '@/types/editorial';
  
  import {
    cn,
  } from '@/lib/utils';
  
  interface StoryVersionComparisonProps {
    liveStory:
      StoryWithRelations;
  
    historicalStory:
      StoryWithRelations;
  
    locale:
      | 'en'
      | 'es';
  
    versionCreatedAt:
      string;
  }
  
  export function StoryVersionComparison({
    liveStory,
    historicalStory,
    locale,
    versionCreatedAt,
  }: StoryVersionComparisonProps) {
    const live =
      createStoryTextSnapshot(
        liveStory
      );
  
    const historical =
      createStoryTextSnapshot(
        historicalStory
      );
  
    const liveLabel =
      locale === 'es'
        ? 'Versión publicada'
        : 'Live version';
  
    const historicalLabel =
      locale === 'es'
        ? 'Versión histórica'
        : 'Historical version';
  
    const savedLabel =
      locale === 'es'
        ? 'Guardada'
        : 'Saved';
  
    return (
      <div className="bg-white">
        {/* ===============================================
            Comparison header
        =============================================== */}
  
        <div
          className="
            border-b
            border-border
            bg-surface-muted
          "
        >
          <div
            className="
              mx-auto
              max-w-7xl
              px-4
              py-5
              sm:px-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-[0.6875rem]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                    text-star
                  "
                >
                  {locale === 'es'
                    ? 'Comparación de versiones'
                    : 'Version comparison'}
                </p>
  
                <h1
                  className="
                    mt-1
                    font-headline
                    text-2xl
                    font-semibold
                    tracking-tight
                    text-deep
                    sm:text-3xl
                  "
                >
                  {locale === 'es'
                    ? 'Versión histórica frente a la versión publicada'
                    : 'Historical version vs. live version'}
                </h1>
  
                <p
                  className="
                    mt-2
                    max-w-2xl
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Los cambios muestran cómo esta versión guardada difiere del artículo publicado actualmente.'
                    : 'Changes show how this saved version differs from the article that is currently published.'}
                </p>
              </div>
  
              <p
                className="
                  shrink-0
                  text-xs
                  text-muted-foreground
                "
              >
                {savedLabel}{' '}
                {new Date(
                  versionCreatedAt
                ).toLocaleString(
                  locale === 'es'
                    ? 'es'
                    : 'en',
                  {
                    dateStyle:
                      'medium',
  
                    timeStyle:
                      'short',
                  }
                )}
              </p>
            </div>
          </div>
        </div>
  
        {/* ===============================================
            Column labels
        =============================================== */}
  
        <div
          className="
            sticky
            top-12
            z-20
            border-b
            border-border
            bg-white/95
            backdrop-blur
          "
        >
          <div
            className="
              mx-auto
              grid
              max-w-7xl
              grid-cols-1
              gap-0
              px-4
              sm:px-6
              lg:grid-cols-2
            "
          >
            <div
              className="
                border-b
                border-border
                py-3
                lg:border-b-0
                lg:border-r
                lg:pr-6
              "
            >
              <div className="flex items-center gap-2">
                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-primary
                  "
                />
  
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-deep
                  "
                >
                  {liveLabel}
                </p>
              </div>
            </div>
  
            <div
              className="
                py-3
                lg:pl-6
              "
            >
              <div className="flex items-center gap-2">
                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-star
                  "
                />
  
                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-deep
                  "
                >
                  {historicalLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
  
        {/* ===============================================
            Comparison body
        =============================================== */}
  
        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            py-6
            sm:px-6
            lg:py-8
          "
        >
          <div className="space-y-8">
            <ComparisonSection
              label={
                locale === 'es'
                  ? 'Titular'
                  : 'Headline'
              }
              liveValue={
                live.headline
              }
              historicalValue={
                historical.headline
              }
              large
            />
  
            <ComparisonSection
              label={
                locale === 'es'
                  ? 'Subtítulo'
                  : 'Subheadline'
              }
              liveValue={
                live.subheadline
              }
              historicalValue={
                historical.subheadline
              }
            />
  
            <ComparisonSection
              label={
                locale === 'es'
                  ? 'Resumen'
                  : 'Summary'
              }
              liveValue={
                live.summary
              }
              historicalValue={
                historical.summary
              }
            />
  
            <ComparisonSection
              label={
                locale === 'es'
                  ? 'Cuerpo'
                  : 'Body'
              }
              liveValue={
                live.body
              }
              historicalValue={
                historical.body
              }
              body
            />
  
            {/* ===========================================
                Historically stored metadata
            =========================================== */}
  
            <div
              className="
                border-t
                border-border
                pt-8
              "
            >
              <p
                className="
                  text-[0.6875rem]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Metadatos guardados'
                  : 'Saved metadata'}
              </p>
  
              <div
                className="
                  mt-4
                  space-y-4
                "
              >
                <SimpleComparison
                  label={
                    locale === 'es'
                      ? 'Idioma'
                      : 'Language'
                  }
                  liveValue={
                    liveStory.language
                      .toUpperCase()
                  }
                  historicalValue={
                    historicalStory.language
                      .toUpperCase()
                  }
                />
  
                <SimpleComparison
                  label={
                    locale === 'es'
                      ? 'Autor'
                      : 'Author'
                  }
                  liveValue={
                    liveStory.author
                      ?.name ??
                    '—'
                  }
                  historicalValue={
                    historicalStory.author
                      ?.name ??
                    '—'
                  }
                />
  
                <SimpleComparison
                  label={
                    locale === 'es'
                      ? 'Editor'
                      : 'Editor'
                  }
                  liveValue={
                    liveStory.editor
                      ?.name ??
                    '—'
                  }
                  historicalValue={
                    historicalStory.editor
                      ?.name ??
                    '—'
                  }
                />
  
                <SimpleComparison
                  label={
                    locale === 'es'
                      ? 'Categoría principal'
                      : 'Primary category'
                  }
                  liveValue={
                    locale === 'es'
                      ? liveStory
                          .primaryCategory
                          ?.nameEs ??
                        '—'
                      : liveStory
                          .primaryCategory
                          ?.nameEn ??
                        '—'
                  }
                  historicalValue={
                    locale === 'es'
                      ? historicalStory
                          .primaryCategory
                          ?.nameEs ??
                        '—'
                      : historicalStory
                          .primaryCategory
                          ?.nameEn ??
                        '—'
                  }
                />
              </div>
            </div>
  
            {/* ===========================================
                Historical coverage notice
            =========================================== */}
  
            <div
              className="
                rounded-lg
                border
                border-border
                bg-surface-muted
                px-4
                py-3
              "
            >
              <p
                className="
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                {locale === 'es'
                  ? 'Las versiones históricas antiguas no almacenaban todos los campos del artículo. Imágenes destacadas, etiquetas, SEO, slug, isla y algunos otros metadatos no se muestran como cambios históricos porque no existen datos históricos fiables para esos campos.'
                  : 'Older historical versions did not store every story field. Featured images, tags, SEO, slug, island, and some other metadata are not shown as historical changes because reliable historical values do not exist for those fields.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  interface ComparisonSectionProps {
    label:
      string;
  
    liveValue:
      string;
  
    historicalValue:
      string;
  
    large?:
      boolean;
  
    body?:
      boolean;
  }
  
  function ComparisonSection({
    label,
    liveValue,
    historicalValue,
    large = false,
    body = false,
  }: ComparisonSectionProps) {
    const changed =
      liveValue !==
      historicalValue;
  
    return (
      <section>
        <div
          className="
            mb-3
            flex
            items-center
            gap-2
          "
        >
          <h2
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.12em]
              text-muted-foreground
            "
          >
            {label}
          </h2>
  
          {changed && (
            <span
              className="
                rounded-md
                bg-star/10
                px-1.5
                py-0.5
                text-[0.625rem]
                font-semibold
                uppercase
                tracking-wide
                text-star
              "
            >
              Changed
            </span>
          )}
        </div>
  
        <div
          className="
            grid
            grid-cols-1
            gap-0
            border
            border-border
            lg:grid-cols-2
          "
        >
          <div
            className="
              min-w-0
              border-b
              border-border
              p-4
              lg:border-b-0
              lg:border-r
              lg:p-5
            "
          >
            <DiffText
              original={
                liveValue
              }
              revised={
                historicalValue
              }
              side="live"
              large={
                large
              }
              body={
                body
              }
            />
          </div>
  
          <div
            className="
              min-w-0
              p-4
              lg:p-5
            "
          >
            <DiffText
              original={
                liveValue
              }
              revised={
                historicalValue
              }
              side="historical"
              large={
                large
              }
              body={
                body
              }
            />
          </div>
        </div>
      </section>
    );
  }
  
  interface DiffTextProps {
    original:
      string;
  
    revised:
      string;
  
    side:
      | 'live'
      | 'historical';
  
    large:
      boolean;
  
    body:
      boolean;
  }
  
  function DiffText({
    original,
    revised,
    side,
    large,
    body,
  }: DiffTextProps) {
    if (
      original ===
      revised
    ) {
      return (
        <p
          className={cn(
            'whitespace-pre-wrap text-foreground',
  
            large &&
              'font-headline text-xl font-semibold leading-snug sm:text-2xl',
  
            !large &&
              !body &&
              'text-sm leading-6',
  
            body &&
              'font-headline text-base leading-7'
          )}
        >
          {original || '—'}
        </p>
      );
    }
  
    const parts =
      diffText(
        original,
        revised
      );
  
    const visibleParts =
      parts.filter(
        (part) => {
          if (
            side ===
            'live'
          ) {
            return (
              part.type !==
              'added'
            );
          }
  
          return (
            part.type !==
            'removed'
          );
        }
      );
  
    return (
      <p
        className={cn(
          'whitespace-pre-wrap',
  
          large &&
            'font-headline text-xl font-semibold leading-snug sm:text-2xl',
  
          !large &&
            !body &&
            'text-sm leading-6',
  
          body &&
            'font-headline text-base leading-7'
        )}
      >
        {visibleParts.map(
          (
            part,
            index
          ) => {
            const isRemoved =
              part.type ===
              'removed';
  
            const isAdded =
              part.type ===
              'added';
  
            return (
              <span
                key={
                  `${part.type}-${index}`
                }
                className={cn(
                  part.type ===
                    'unchanged' &&
                    'text-foreground',
  
                  isRemoved &&
                    'bg-breaking/10 text-breaking line-through decoration-breaking/60',
  
                  isAdded &&
                    'bg-green-100 text-green-900'
                )}
              >
                {part.value}
              </span>
            );
          }
        )}
      </p>
    );
  }
  
  interface SimpleComparisonProps {
    label:
      string;
  
    liveValue:
      string;
  
    historicalValue:
      string;
  }
  
  function SimpleComparison({
    label,
    liveValue,
    historicalValue,
  }: SimpleComparisonProps) {
    const changed =
      liveValue !==
      historicalValue;
  
    return (
      <div>
        <p
          className="
            mb-2
            text-xs
            font-semibold
            text-muted-foreground
          "
        >
          {label}
        </p>
  
        <div
          className="
            grid
            grid-cols-1
            border
            border-border
            text-sm
            lg:grid-cols-2
          "
        >
          <div
            className="
              border-b
              border-border
              p-3
              lg:border-b-0
              lg:border-r
            "
          >
            <span
              className={cn(
                'text-foreground',
  
                changed &&
                  'bg-breaking/10 text-breaking line-through decoration-breaking/60'
              )}
            >
              {liveValue}
            </span>
          </div>
  
          <div className="p-3">
            <span
              className={cn(
                'text-foreground',
  
                changed &&
                  'bg-green-100 text-green-900'
              )}
            >
              {historicalValue}
            </span>
          </div>
        </div>
      </div>
    );
  }