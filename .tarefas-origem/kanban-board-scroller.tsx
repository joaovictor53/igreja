import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type KanbanBoardScrollerProps = {
  children: ReactNode;
  /** Total de colunas (inclui "Sem categoria") para o texto de orientação */
  columnCount: number;
  className?: string;
};

export function KanbanBoardScroller({
  children,
  columnCount,
  className,
}: KanbanBoardScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [visibleColumn, setVisibleColumn] = useState(1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);

    const childrenEls = Array.from(el.children) as HTMLElement[];
    if (childrenEls.length === 0) {
      setVisibleColumn(1);
      return;
    }

    const center = scrollLeft + clientWidth / 2;
    let index = 0;
    for (let i = 0; i < childrenEls.length; i++) {
      const child = childrenEls[i];
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      if (childCenter >= center - 8) {
        index = i;
        break;
      }
      index = i;
    }
    setVisibleColumn(index + 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, columnCount]);

  const scrollByColumn = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const gap = 12;
    const step = firstChild ? firstChild.offsetWidth + gap : 300;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  const showHints = columnCount > 1;
  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className={cn("relative min-w-0", className)}>
      {showHints && canScrollLeft ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-background via-background/80 to-transparent sm:block"
          aria-hidden
        />
      ) : null}
      {showHints && canScrollRight ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background via-background/85 to-transparent sm:w-14"
          aria-hidden
        />
      ) : null}

      {showHints && canScrollLeft ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute left-1 top-3 z-20 hidden h-8 w-8 rounded-full shadow-md sm:inline-flex"
          onClick={() => scrollByColumn("left")}
          aria-label="Ver categorias à esquerda"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : null}
      {showHints && canScrollRight ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-1 top-3 z-20 hidden h-8 w-8 rounded-full shadow-md sm:inline-flex"
          onClick={() => scrollByColumn("right")}
          aria-label="Ver mais categorias à direita"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory",
          "touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          isMobile && "px-0.5",
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        {children}
      </div>

      {showHints && hasOverflow ? (
        <div className="mt-2 space-y-2">
          {/* Barra de navegação — principal em telas pequenas */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/25 p-2 sm:justify-center sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 flex-1 gap-1 sm:hidden"
              disabled={!canScrollLeft}
              onClick={() => scrollByColumn("left")}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Anterior
            </Button>

            <div className="flex shrink-0 flex-col items-center gap-1 px-1 sm:flex-row sm:gap-2">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {visibleColumn} / {columnCount}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">categorias</span>
              <div className="flex gap-1">
                {Array.from({ length: columnCount }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i + 1 === visibleColumn
                        ? "w-4 bg-primary"
                        : "w-1.5 bg-muted-foreground/35",
                    )}
                    aria-hidden
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-10 flex-1 gap-1 sm:hidden"
              disabled={!canScrollRight}
              onClick={() => scrollByColumn("right")}
            >
              Próxima
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground sm:hidden">
            Deslize o dedo para o lado ou toque em <span className="font-medium text-foreground">Próxima</span> para ver mais categorias
          </p>
          {canScrollRight ? (
            <p className="hidden items-center justify-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              Role para o lado para ver mais categorias
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                {columnCount} colunas
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Largura das colunas: em telas pequenas deixa “vazar” a próxima coluna (~15%),
 * indicando que há mais conteúdo à direita (padrão carrossel/Trello mobile).
 */
export const KANBAN_COLUMN_WIDTH_CLASS =
  "w-[min(280px,82vw)] shrink-0 snap-start sm:w-[300px]";
