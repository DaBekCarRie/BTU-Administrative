import { loadQueueView } from "./load";
import { QueueView } from "./queue-view";

export default async function QueuePage() {
  return <QueueView {...await loadQueueView()} />;
}
