export type AvailabilitySlot = {
  id: string;
  programmeSlug: string;
  variantName: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
};

export type PersonalTrainingBookingMode = "group" | "one_to_one";

export type PersonalTrainingAvailabilitySlot = AvailabilitySlot & {
  allowedBookingModes: PersonalTrainingBookingMode[];
  bookingMode: PersonalTrainingBookingMode | null;
  spacesRemaining: number;
};

export type CheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  babyName: string;
  babyAgeMonths: number;
};
