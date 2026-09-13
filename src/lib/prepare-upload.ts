import imageCompression from "browser-image-compression";

/**
 * รูปจากมือถือมักใหญ่ 3-5 MB ต่อใบ คูณจำนวนเอกสาร คูณ 500 คน/ปี จะชนเพดาน storage ใน 1 ปี
 * ย่อเหลือประมาณ 300 KB อ่านออกเท่าเดิม — ใช้ค่าเดียวกันทุกที่ที่อัปโหลดไฟล์จากเบราว์เซอร์
 */
export const IMAGE_COMPRESSION = { maxSizeMB: 0.3, maxWidthOrHeight: 1600, useWebWorker: true };

/** ย่อรูปก่อนอัปโหลด ส่วน PDF และไฟล์อื่นส่งตามเดิม */
export async function prepareUpload(file: File): Promise<File> {
  return file.type.startsWith("image/") ? imageCompression(file, IMAGE_COMPRESSION) : file;
}
