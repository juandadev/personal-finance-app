import { describe, expect, test } from "bun:test"

import {
  describeProtectedTransaction,
  getTransactionProtection,
} from "@/lib/finance/transaction-protection"

describe("getTransactionProtection", () => {
  test("leaves ordinary transactions unprotected", () => {
    expect(
      getTransactionProtection({
        isPotMovement: false,
        potName: null,
        billConcept: null,
      }),
    ).toBeUndefined()
  })

  test("protects pot movements even after their pot is deleted", () => {
    expect(
      getTransactionProtection({
        isPotMovement: true,
        potName: null,
        billConcept: null,
      }),
    ).toEqual({
      kind: "pot_movement",
      potName: undefined,
      isPlannedSave: false,
    })
  })

  test("treats a pot movement that pays a bill as a Planned Save", () => {
    expect(
      getTransactionProtection({
        isPotMovement: true,
        potName: "Vacation",
        billConcept: "Vacation fund",
      }),
    ).toEqual({
      kind: "pot_movement",
      potName: "Vacation",
      isPlannedSave: true,
    })
  })

  test("protects statement adjustments", () => {
    expect(
      getTransactionProtection({
        isPotMovement: false,
        potName: null,
        billConcept: null,
        paymentMethod: "credit_card_statement_adjustment",
        creditCardId: "card-1",
        cardNickname: "Travel Card",
      }),
    ).toEqual({
      kind: "statement_adjustment",
      creditCardId: "card-1",
      cardNickname: "Travel Card",
    })
  })

  test("protects bill payments", () => {
    expect(
      getTransactionProtection({
        isPotMovement: false,
        potName: null,
        billConcept: "Internet",
      }),
    ).toEqual({ kind: "bill_payment", billConcept: "Internet" })
  })
})

describe("describeProtectedTransaction", () => {
  test("names the pot when it still exists", () => {
    expect(
      describeProtectedTransaction({
        kind: "pot_movement",
        potName: "Vacation",
        isPlannedSave: false,
      }),
    ).toBe(
      "This transaction is a pot movement for the Vacation pot. Its type, amount, contact, and date are locked, and it can't be deleted.",
    )
  })

  test("omits the pot name when the pot is gone", () => {
    expect(
      describeProtectedTransaction({
        kind: "pot_movement",
        isPlannedSave: true,
      }),
    ).toBe(
      "This transaction is a Planned Save. Its type, amount, contact, and date are locked, and it can't be deleted.",
    )
  })

  test("names the card for a statement adjustment", () => {
    expect(
      describeProtectedTransaction({
        kind: "statement_adjustment",
        creditCardId: "card-1",
        cardNickname: "Travel Card",
      }),
    ).toBe(
      "This transaction is a statement adjustment for Travel Card. Its type, amount, concept, category, contact, and date are locked, and it can't be deleted.",
    )
  })

  test("names the recurring bill for bill payments", () => {
    expect(
      describeProtectedTransaction({
        kind: "bill_payment",
        billConcept: "Internet",
      }),
    ).toBe(
      "This transaction pays the recurring bill 'Internet'. Its type, amount, contact, payment method, and date are locked, and it can't be deleted.",
    )
  })
})
