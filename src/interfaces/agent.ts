// types/agent.ts

export interface Agent {
  _id: string;
  first_name: string;
  last_name: string;
  agent_license_number: string;
  card_expiry_date: string; // รับเป็น string จาก API (ISO Date)
  address: string;
  imgProfile?: string;
  idLine?: string;
  phone: string;
  note?: string;
  username: string;
  birth_date: string;
  verification_status: 'in_review' | 'approved' | 'rejected';
  assigned_count: number;
  createdAt: string;
  updatedAt: string;
}

// Type สำหรับข้อมูลที่จะส่งไปแก้ไข (Pick มาเฉพาะตัวที่แก้ได้)
export interface UpdateAgentDTO {
  address: string;
  imgProfile?: string;
  idLine?: string;
  phone: string;
  note?: string;
}