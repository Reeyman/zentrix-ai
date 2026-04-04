const BRAND_MARK_SRC = '/icon.svg?v=3'

type BrandMarkProps = {
  alt?: string
  className?: string
  priority?: boolean
  size?: number
}

export function BrandMark({ alt = 'Zentrix AI', className, priority = false, size = 32 }: BrandMarkProps) {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}
