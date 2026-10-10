"use client";

import { useFormStatus } from "react-dom";

type Props = {
  reservationId: string;
  name: string;
  disabled: boolean;
  action: (formData: FormData) => Promise<void>;
};

function RemoveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending}>{pending ? "Removing…" : "Remove"}</button>;
}

export function RemoveCharityReservationForm({ reservationId, name, disabled, action }: Props) {
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm(`Remove ${name}’s Stay & Play reservation? This will free their ticket. This cannot be undone and no email will be sent.`)) event.preventDefault();
  }}>
    <input type="hidden" name="reservationId" value={reservationId} />
    <RemoveButton disabled={disabled} />
  </form>;
}
