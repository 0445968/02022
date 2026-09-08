'use client';

interface FrontPageEditorSectionProps {
  number: string;
  title: string;
  description?: string;
  children:
    React.ReactNode;
}

export function FrontPageEditorSection({
  number,
  title,
  description,
  children,
}: FrontPageEditorSectionProps) {
  return (
    <section
      className="
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-border
        bg-surface-muted/25
      "
    >
      <header
        className="
          flex
          flex-col
          gap-3
          border-b
          border-border
          bg-white
          p-5
          sm:flex-row
          sm:items-start
          sm:gap-4
          xl:p-6
        "
      >
        <span
          className="
            inline-flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-deep
            text-xs
            font-bold
            text-white
          "
        >
          {number}
        </span>

        <div
          className="
            min-w-0
          "
        >
          <h2
            className="
              font-headline
              text-xl
              font-bold
              tracking-tight
              text-deep
            "
          >
            {title}
          </h2>

          {description && (
            <p
              className="
                mt-1
                max-w-4xl
                text-sm
                leading-6
                text-muted-foreground
              "
            >
              {description}
            </p>
          )}
        </div>
      </header>

      <div
        className="
          min-w-0
          p-4
          sm:p-5
          xl:p-6
        "
      >
        {children}
      </div>
    </section>
  );
}