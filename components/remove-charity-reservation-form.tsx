"use client";

import { useFormStatus } from "react-dom";

type Props = {
  reservationId: string;
  name: string;
  disabled: boolean;
  waitlist?: boolean;
  action: (formData: FormData) => Promise<void>;
};

function RemoveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending}>{pending ? "Removing…" : "Remove"}</button>;
}

export function RemoveCharityReservationForm({ reservationId, name, disabled, action, waitlist = false }: Props) {
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm(`Remove ${name}’s Stay & Play ${waitlist ? "waitlist entry?" : "reservation? This will free their ticket."} This cannot be undone and no email will be sent.`)) event.preventDefault();
  }}>
    <input type="hidden" name="waitlist" value={String(waitlist)} />
    <input type="hidden" name="reservationId" value={reservationId} />
    <RemoveButton disabled={disabled} />
  </form>;
}
