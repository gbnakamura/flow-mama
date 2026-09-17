"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";

type ProgrammeOption = {
  id: string;
  name: string;
  slug: string;
  location: string;
};

type AvailabilityAction = (formData: FormData) => void | Promise<void>;

type AdminAvailabilityFormProps = {
  programmes: ProgrammeOption[];
  defaultProgrammeId?: string;
  defaultLocation: string;
  preview: boolean;
  createOneOffAction: AvailabilityAction;
  createRecurringAction: AvailabilityAction;
};

export function AdminAvailabilityForm({
  programmes,
  defaultProgrammeId,
  defaultLocation,
  preview,
  createOneOffAction,
  createRecurringAction,
}: AdminAvailabilityFormProps) {
  const [scheduleType, setScheduleType] = useState<"one-off" | "recurring">("one-off");
  const recurring = scheduleType === "recurring";

  return (
    <section className="admin-panel admin-form-panel">
      <div className="admin-panel-heading admin-availability-heading">
        <div>
          <p className="booking-eyebrow">New availability</p>
          <h2>{recurring ? <CalendarRange size={21} /> : <CalendarDays size={21} />} Add session availability</h2>
        </div>
        <p>{recurring ? "Create one session every week between the chosen dates." : "Publish one specific date without creating a weekly series."}</p>
      </div>

      <div className="admin-schedule-toggle" aria-label="Schedule type">
        <button
          type="button"
          className={recurring ? "" : "selected"}
          aria-pressed={!recurring}
          onClick={() => setScheduleType("one-off")}
        >
          <CalendarDays size={18} />
          <span><strong>One-off</strong><small>One specific date</small></span>
        </button>
        <button
          type="button"
          className={recurring ? "selected" : ""}
          aria-pressed={recurring}
          onClick={() => setScheduleType("recurring")}
        >
          <CalendarRange size={18} />
          <span><strong>Recurring</strong><small>Weekly date range</small></span>
        </button>
      </div>

      <form className="admin-form-grid" action={recurring ? createRecurringAction : createOneOffAction}>
        <label>Business<input value="Flow Mama" disabled /></label>
        <label>Programme<select required name="programmeId" defaultValue={defaultProgrammeId} disabled={preview}>{programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}</select></label>
        <label>Session name<input required name="sessionName" defaultValue="Personal Training" placeholder="Early Flow" disabled={preview} /></label>

        {recurring ? (
          <>
            <label>Day of week<select name="weekday" defaultValue="1" disabled={preview}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>
            <label>First possible date<input required type="date" name="startDate" disabled={preview} /></label>
            <label>Continue through<input required type="date" name="endDate" disabled={preview} /></label>
          </>
        ) : (
          <label>Date<input required type="date" name="date" disabled={preview} /></label>
        )}

        <label>Start time<input required type="time" name="startTime" disabled={preview} /></label>
        <label>End time<input required type="time" name="endTime" disabled={preview} /></label>
        <label>Capacity (Personal Training is fixed at 3)<input required type="number" name="capacity" min="1" max="100" defaultValue="3" disabled={preview} /></label>
        <label>Personal training availability<select required name="bookingAvailability" defaultValue="both" disabled={preview}><option value="both">Group + 1:1</option><option value="group">Group only</option><option value="one_to_one">1:1 only</option></select></label>
        <label className="admin-form-wide">Location<input required name="location" defaultValue={defaultLocation} disabled={preview} /></label>
        <div className="admin-form-note admin-form-wide"><strong>Personal training availability</strong><span>For Personal Training dates, capacity is always three. A “Group + 1:1” time locks to whichever type is paid for first. The availability choice is ignored for other Flow Mama programmes.</span></div>
        <button className="pay-button admin-form-wide" disabled={preview}>Create {recurring ? "recurring sessions" : "one-off session"}</button>
      </form>
    </section>
  );
}
