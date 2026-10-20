import { describe, expect, test } from "bun:test";
import { reservationConflicts, reservationNights } from "./reservation-rules";
import type { HotelReservation, TripDay } from "./queries";

const booking: HotelReservation = { id: "booking", hotel_name: "KOKO HOTEL Tokyo Nishikasai", city: "Tóquio", checkin: "2026-11-01", checkout: "2026-11-20", guests: 2, room_description: null, amount_brl: 8538.38, status: "confirmed", payment_status: "unconfirmed", breakfast_status: "unconfirmed" };
const day = (date: string, city: string): TripDay => ({ id: date, date, city, day_number: 1, position: 1, phase: "tokyo", summary: null, notes: null });
describe("confirmed hotel stay", () => {
  test("November 1 through November 20 is 19 nights", () => {
    expect(reservationNights(booking)).toBe(19);
  });
  test("other cities within the stay require review, excluding checkout day", () => {
    expect(reservationConflicts([booking], [day("2026-11-01", "Tóquio"), day("2026-11-05", "Kyoto"), day("2026-11-20", "Osaka")]).map(d => d.city)).toEqual(["Kyoto"]);
  });
  test("cancelled reservations do not constrain the route", () => {
    expect(reservationConflicts([{ ...booking, status: "cancelled" }], [day("2026-11-05", "Kyoto")])).toEqual([]);
  });
});