"use client"

import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

/**
 * Whether Embla may evaluate breakpoint media queries for a DOM node.
 *
 * Puck preview iframes can briefly expose `ownerDocument.defaultView === null`
 * before the browsing context attaches; Embla then throws on `matchMedia`.
 *
 * @param node - Viewport or carousel root element.
 * @returns True when `defaultView.matchMedia` is callable.
 */
export function canUseCarouselMatchMedia(
  node: Element | null | undefined,
): boolean {
  const ownerWindow = node?.ownerDocument?.defaultView
  return Boolean(ownerWindow && typeof ownerWindow.matchMedia === "function")
}

/** Strip breakpoint keys until the viewport browsing context is ready. */
function carouselOptsWithoutBreakpoints(
  opts?: CarouselOptions,
): CarouselOptions | undefined {
  if (!opts?.breakpoints) return opts
  const { breakpoints: _breakpoints, ...rest } = opts
  return rest
}

type CarouselContextProps = {
  assignCarouselViewport: (node: HTMLDivElement | null) => void
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [breakpointsReady, setBreakpointsReady] = React.useState(false)
  const attachRafRef = React.useRef(0)

  const emblaOpts = React.useMemo(() => {
    const merged = {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    } as CarouselOptions
    return breakpointsReady ? merged : carouselOptsWithoutBreakpoints(merged)
  }, [breakpointsReady, opts, orientation])

  const [carouselRef, api] = useEmblaCarousel(emblaOpts, plugins)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const assignCarouselViewport = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (attachRafRef.current) {
        cancelAnimationFrame(attachRafRef.current)
        attachRafRef.current = 0
      }

      if (!node) {
        setBreakpointsReady(false)
        carouselRef(null)
        return
      }

      const tryAttach = () => {
        if (canUseCarouselMatchMedia(node)) {
          carouselRef(node)
          setBreakpointsReady(true)
          attachRafRef.current = 0
          return
        }
        attachRafRef.current = requestAnimationFrame(tryAttach)
      }

      tryAttach()
    },
    [carouselRef],
  )

  React.useEffect(() => {
    return () => {
      if (attachRafRef.current) {
        cancelAnimationFrame(attachRafRef.current)
      }
    }
  }, [])

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api?.off("select", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        assignCarouselViewport,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { assignCarouselViewport, orientation } = useCarousel()

  return (
    <div
      ref={assignCarouselViewport}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={(e) => {
        scrollPrev()
        onClick?.(e)
      }}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute touch-manipulation rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={(e) => {
        scrollNext()
        onClick?.(e)
      }}
      {...props}
    >
      <ChevronRightIcon />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  useCarousel,
}
