import { getCallQueue } from "@/lib/data/call-queue";
import { listFacultiesWithPrograms } from "@/lib/data/master-data";
import { listStaffOptions } from "@/lib/data/people";
import { getWorkBoard } from "@/lib/data/work-board";
import { QueueView } from "./queue-view";

export default async function QueuePage() {
  const [queue, board, staff, faculties] = await Promise.all([
    getCallQueue(),
    getWorkBoard(),
    listStaffOptions(),
    listFacultiesWithPrograms(),
  ]);

  return (
    <QueueView
      initialQueue={queue}
      board={board}
      staffList={staff.map((s) => ({ id: s.id, name: s.display_name }))}
      facultyList={faculties.map((f) => ({ id: f.id, name: f.name }))}
    />
  );
}
