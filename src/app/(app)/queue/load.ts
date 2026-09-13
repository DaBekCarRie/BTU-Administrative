import "server-only";

import { getCallQueue } from "@/lib/data/call-queue";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { listStaffOptions } from "@/lib/data/people";
import { getWorkBoard } from "@/lib/data/work-board";

/** ข้อมูลของคิวโทร — ใช้ร่วมกันระหว่างหน้าคิวโทรกับหน้าแรก */
export async function loadQueueView() {
  const [queue, board, staff, faculties] = await Promise.all([
    getCallQueue(),
    getWorkBoard(),
    listStaffOptions(),
    listFacultiesWithPrograms(),
  ]);

  return {
    initialQueue: queue,
    board,
    staffList: staff.map((s) => ({ id: s.id, name: s.display_name })),
    facultyList: faculties.map((f) => ({ id: f.id, name: f.name })),
  };
}
