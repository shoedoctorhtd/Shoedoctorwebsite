/**
 * Child rows are canonical for new bookings. Existing production rows do not
 * have children, so present their retained single-pair columns as Pair 1.
 *
 * @param {import("./data").Booking} booking
 * @returns {import("./data").BookingItem[]}
 */
export function getBookingItems(booking) {
  if (booking.items?.length) return booking.items;

  return [
    {
      id: `legacy-${booking.id}`,
      bookingId: booking.id,
      pairNumber: 1,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      servicePriceLabel: "Quote after review",
      servicePrice: null,
      footwearType: booking.shoeType,
      brand: booking.shoeBrand,
      specialRequest: booking.notes,
      status: null,
      createdAt: booking.createdAt,
    },
  ];
}
