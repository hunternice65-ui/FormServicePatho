export interface UserProfile {
  lineUserId: string;
  name: string;
  position: string;
  department: string;
  phone: string;
}

export interface ServiceRequest {
  id?: number;
  lineUserId: string;
  type: string;
  data: any;
  status: string;
  adminNote?: string;
  createdAt: string;
  userName?: string;
  userPhone?: string;
}

export const DOCTORS = [
  "ผศ.พญ.จุลินทร สำราญ",
  "ผศ.พญ.ละออ ชมพักตร์",
  "ผศ.นพ.พีรยุทธ สิทธิไชยากุล",
  "นพ.ชัยพร วิโรจน์แสงอรุณ",
  "ผศ.นพ.ภูศิษฏ์ เรืองวาณิชยกุล",
  "นพ.รักษิต ชินรักษ์บำรุง",
  "นพ.นันท์ สิงห์ปาน",
  "นพ.เจษฎา จันทร์คฤหาสน์",
  "พญ.สุรภา พรมพิทักษ์",
  "นพ.ศุภกิจ คูธารทอง"
];

export const REQUEST_TYPES = {
  REVIEW: "ขอทบทวนสไลด์/ผลการวินิจฉัย",
  URGENT: "ตามผลด่วน",
  CONFERENCE: "ขอข้อมูลการตรวจวินิจฉัยเข้าประชุม Conference",
  REAGENTS: "ขอน้ำยา/วัสดุวิทยาศาสตร์",
  EQUIPMENT: "ขอใช้วัสดุอุปกรณ์และเครื่องมือ",
  BORROW: "ขอยืม",
  OTHERS: "อื่นๆ"
};
