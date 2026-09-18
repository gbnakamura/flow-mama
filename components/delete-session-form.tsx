"use client";

type DeleteSessionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  bookedCount: number;
  disabled?: boolean;
  slotId: string;
};

export function DeleteSessionForm({ action, bookedCount, disabled = false, slotId }: DeleteSessionFormProps) {
  const attendeeLabel = `${bookedCount} confirmed ${bookedCount === 1 ? "attendee record" : "attendee records"}`;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Permanently delete this session?\n\nThis will remove the session, ${attendeeLabel}, and any associated checkout selections. Customer, order and payment records will be kept.\n\nThis cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="confirmDelete" value="yes" />
      <p>Customer, order and payment records will be retained.</p>
      <button className="danger-button" disabled={disabled}>Delete session</button>
    </form>
  );
}
