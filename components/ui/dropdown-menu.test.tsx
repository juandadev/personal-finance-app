import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

afterEach(() => {
  cleanup()
})

function renderMenu() {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>More actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Edit</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
}

function pointerEvent(
  type: "mouse" | "touch",
  clientX: number,
  clientY: number,
) {
  return {
    pointerType: type,
    pointerId: 1,
    button: 0,
    clientX,
    clientY,
  }
}

describe("DropdownMenu touch opening", () => {
  test("does not open on touch pointer down", () => {
    renderMenu()

    act(() => {
      fireEvent.pointerDown(
        screen.getByRole("button", { name: "More actions" }),
        pointerEvent("touch", 20, 20),
      )
    })

    expect(screen.queryByRole("menu")).toBeNull()
  })

  test("opens on a touch tap without movement", () => {
    renderMenu()
    const trigger = screen.getByRole("button", { name: "More actions" })

    act(() => {
      fireEvent.pointerDown(trigger, pointerEvent("touch", 20, 20))
      fireEvent.pointerUp(trigger, pointerEvent("touch", 21, 22))
    })

    expect(screen.getByRole("menu")).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy()
  })

  test("does not open when the touch pointer moves as if scrolling", () => {
    renderMenu()
    const trigger = screen.getByRole("button", { name: "More actions" })

    act(() => {
      fireEvent.pointerDown(trigger, pointerEvent("touch", 20, 20))
      fireEvent.pointerUp(trigger, pointerEvent("touch", 20, 80))
    })

    expect(screen.queryByRole("menu")).toBeNull()
  })

  test("opens on mouse pointer down", () => {
    renderMenu()

    act(() => {
      fireEvent.pointerDown(
        screen.getByRole("button", { name: "More actions" }),
        pointerEvent("mouse", 20, 20),
      )
    })

    expect(screen.getByRole("menu")).toBeTruthy()
  })
})
