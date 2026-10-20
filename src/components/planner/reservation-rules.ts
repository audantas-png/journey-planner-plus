import type { HotelReservation, TripDay } from "./queries";

export function reservationNights(reservation: Pick<HotelReservation, "checkin" | "checkout">): number {
  return Math.round((Date.parse(reservation.checkout) - Date.parse(reservation.checkin)) / 86400000);
}

export function reservationConflicts(reservations: HotelReservation[], days: TripDay[]): TripDay[] {
  return days.filter(day => reservations.some(reservation =>
    reservation.status === "confirmed" && day.date >= reservation.checkin &&
    day.date < reservation.checkout && day.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() !==
    reservation.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  ));
}