interface PageHeadingProps {
  title: string
}

export function PageHeading({ title }: PageHeadingProps) {
  return (
    <header>
      <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h1>
    </header>
  )
}
