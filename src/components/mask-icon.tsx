import type { CSSProperties } from "react"
import { cn } from "cn"

// Renders a single-color SVG asset as a CSS mask so it takes the current
// text color — lets exported Figma icons follow the light/dark theme.
export function MaskIcon({
  src,
  className,
  style: styleProp,
}: {
  src: string
  className?: string
  style?: CSSProperties
}) {
  const style = {
    ...styleProp,
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
  } satisfies CSSProperties

  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "inline-block shrink-0 bg-current mask-contain mask-center mask-no-repeat",
        className
      )}
    />
  )
}
