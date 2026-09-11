import { applyEvent, type DomainEvent, type PersonState } from "./events";

/** ชั้นบาง ๆ ที่ทั้งแอปและสคริปต์นำเข้าข้อมูลใช้ร่วมกัน */
export type EventWriter = {
  readState: (personId: string) => Promise<PersonState | null>;
  write: (
    personId: string,
    event: DomainEvent,
    nextState: PersonState,
  ) => Promise<void>;
};

/**
 * ทางเดียวที่อนุญาตให้เขียนข้อมูลคน (ADR-0001)
 *
 * คำนวณสถานะใหม่ด้วยฟังก์ชันบริสุทธิ์ แล้วให้ผู้เขียนบันทึกเหตุการณ์กับสถานะ
 * ในทรานแซกชันเดียว — สคริปต์นำเข้าข้อมูลต้องผ่านทางนี้เหมือนกัน ห้าม INSERT ตรง
 */
export async function recordEventWith(
  writer: EventWriter,
  personId: string,
  event: DomainEvent,
): Promise<PersonState> {
  const current = await writer.readState(personId);
  const nextState = applyEvent(current, event);
  await writer.write(personId, event, nextState);
  return nextState;
}
