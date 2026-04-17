"use client";
import { useState } from "react";
import { DoneePicker } from "./DoneePicker";

export function TaxDoneePicker({ defaultId }: { defaultId?: string }) {
  const [id, setId] = useState(defaultId ?? "");
  return (
    <>
      <DoneePicker onSelect={(d) => setId(d.id)} />
      <input type="hidden" name="donee" value={id} />
    </>
  );
}
