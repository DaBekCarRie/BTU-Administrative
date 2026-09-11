"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FacultyWithPrograms } from "@/lib/data/master-data";
import { createLead, editLead, type LeadFormState } from "../actions";

type StaffOption = { id: string; display_name: string };

const STUDY_MODES = ["ปกติ", "สมทบ", "ทางไกล"] as const;
const PRIOR_EDUCATION = [
  "ม.6",
  "กศน.เทียบเท่า ม.6",
  "ปวช.",
  "ปวส.",
  "ปริญญาตรี",
  "อื่นๆ",
] as const;

/**
 * ทุกช่องประเภทเป็น dropdown ไม่มีช่องพิมพ์อิสระ
 * ระบบเดิมพิมพ์มือแล้วคณะ 10 คณะกลายเป็น 64 ค่า
 */
function SelectField({
  id,
  name,
  label,
  children,
  required,
  disabled,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue ?? ""}
        className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  );
}

export type LeadFormValues = {
  id: string;
  fullName: string;
  nickname: string | null;
  phone: string | null;
  lineId: string | null;
  facebookName: string | null;
  facultyId: string | null;
  programId: string | null;
  studyMode: string | null;
  priorEducation: string | null;
  ownerId: string | null;
  note: string | null;
};

export function LeadForm({
  faculties,
  staff,
  person,
}: {
  faculties: FacultyWithPrograms[];
  staff: StaffOption[];
  person?: LeadFormValues;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    person ? editLead : createLead,
    {},
  );
  const [facultyId, setFacultyId] = useState(person?.facultyId ?? "");

  const programs = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.programs ?? [],
    [faculties, facultyId],
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {person ? <input type="hidden" name="personId" value={person.id} /> : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="fullName">ชื่อ–สกุล หรือชื่อ Facebook</Label>
          <Input id="fullName" name="fullName" required defaultValue={person?.fullName} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nickname">ชื่อเล่น</Label>
          <Input id="nickname" name="nickname" defaultValue={person?.nickname ?? ""} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            placeholder="0812345678"
            defaultValue={person?.phone ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="facebookName">ชื่อ Facebook</Label>
          <Input
            id="facebookName"
            name="facebookName"
            defaultValue={person?.facebookName ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="lineId">Line</Label>
          <Input id="lineId" name="lineId" defaultValue={person?.lineId ?? ""} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="facultyId">คณะ</Label>
          <select
            id="facultyId"
            name="facultyId"
            value={facultyId}
            onChange={(event) => setFacultyId(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <option value="">— ยังไม่ระบุ —</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </div>

        <SelectField
          key={facultyId}
          id="programId"
          name="programId"
          label="สาขา"
          disabled={!facultyId}
          defaultValue={person?.programId ?? ""}
        >
          <option value="">
            {facultyId ? "— ยังไม่ระบุ —" : "เลือกคณะก่อน"}
          </option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="studyMode"
          name="studyMode"
          label="ภาค"
          defaultValue={person?.studyMode ?? ""}
        >
          <option value="">— ยังไม่ระบุ —</option>
          {STUDY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="priorEducation"
          name="priorEducation"
          label="วุฒิที่ใช้สมัคร"
          defaultValue={person?.priorEducation ?? ""}
        >
          <option value="">— ยังไม่ระบุ —</option>
          {PRIOR_EDUCATION.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="ownerId"
          name="ownerId"
          label="เจ้าหน้าที่ผู้ดูแล"
          defaultValue={person?.ownerId ?? ""}
        >
          <option value="">— ยังไม่ระบุ —</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.display_name}
            </option>
          ))}
        </SelectField>

        <SelectField id="source" name="source" label="ติดต่อเข้ามาทาง">
          <option value="">— ยังไม่ระบุ —</option>
          {["Facebook", "Line", "โทรเข้ามา", "Walk-in", "แนะนำต่อ"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </section>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">หมายเหตุ</Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={person?.note ?? ""}
        />
      </div>

      {state.error ? (
        <p role="alert" data-testid="lead-error" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : person ? "บันทึกการแก้ไข" : "บันทึกผู้สนใจ"}
        </Button>
      </div>
    </form>
  );
}
