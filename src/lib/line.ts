import { serverEnv } from "@/lib/env";

const PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

/**
 * ส่งข้อความเข้ากลุ่ม LINE ของทีมผ่าน Messaging API
 *
 * ยังไม่ได้เปิดใช้ในเฟสนี้ — ต้องตั้ง LINE_CHANNEL_ACCESS_TOKEN และ LINE_GROUP_ID ก่อน
 * หมายเหตุ: การ push เข้ากลุ่มนับเป็นข้อความตามโควตาของ Official Account
 */
export async function pushToTeamGroup(text: string): Promise<void> {
  const { lineChannelAccessToken, lineGroupId } = serverEnv();

  if (!lineChannelAccessToken || !lineGroupId) {
    console.warn("[line] ข้ามการส่ง — ยังไม่ได้ตั้งค่า token หรือ group id");
    return;
  }

  const res = await fetch(PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineChannelAccessToken}`,
    },
    body: JSON.stringify({
      to: lineGroupId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    throw new Error(`[line] ส่งไม่สำเร็จ ${res.status}: ${await res.text()}`);
  }
}
