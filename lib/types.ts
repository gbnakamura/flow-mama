export type AvailabilitySlot = {
  id: string;
  programmeSlug: string;
  variantName: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
};

export type CheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  babyName: string;
  babyAgeMonths: number;
};
