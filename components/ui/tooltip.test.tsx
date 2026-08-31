import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

afterEach(() => {
  cleanup()
  mock.restore()
})

function mockFineHover(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("hover: hover") ? matches : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
    }),
  })
}

describe("Tooltip", () => {
  test("does not show on devices that cannot hover", async () => {
    mockFineHover(false)
    const { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } =
      await import("@/components/ui/tooltip")

    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Amount</TooltipTrigger>
          <TooltipContent>More actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )

    fireEvent.pointerMove(screen.getByText("Amount"))
    fireEvent.focus(screen.getByText("Amount"))

    expect(screen.queryByRole("tooltip")).toBeNull()
    expect(screen.queryByText("More actions")).toBeNull()
  })
})
