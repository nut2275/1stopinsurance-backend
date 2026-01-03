import cron from 'node-cron';
import PurchaseModel from '../models/Purchase.model';
import NotificationModel from '../models/Notification.model'; // ✅ Import Model แจ้งเตือน (ต้องมี Model นี้)

const checkExpiringPolicies = async () => {
  console.log('⏳ Checking for expiring policies and notifying users...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // 1. ค้นหา Policy ที่ต้องแจ้งเตือน (Active + หมดอายุภายใน 30 วัน)
    // ✅ ต้อง Populate เพื่อเอาชื่อลูกค้า/ทะเบียนรถ มาใส่ในข้อความแจ้งเตือน
    const policiesToExpire = await PurchaseModel.find({
      status: 'active',
      end_date: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    }).populate('customer_id agent_id car_id');

    if (policiesToExpire.length === 0) {
      console.log('✅ Update Summary: No policies needed update.');
      return;
    }

    console.log(`🔔 Found ${policiesToExpire.length} policies to expire. Sending notifications...`);

    // 2. วนลูปส่งแจ้งเตือนและอัปเดตสถานะ
    for (const policy of policiesToExpire) {
      const customer = policy.customer_id as any;
      const agent = policy.agent_id as any;
      const car = policy.car_id as any;
      
      const carReg = car ? `${car.registration} ${car.province}` : 'ไม่ระบุทะเบียน';
      const endDateStr = new Date(policy.end_date!).toLocaleDateString('th-TH');

      // --- A. แจ้งเตือนลูกค้า ---
      if (customer && customer._id) {
        await NotificationModel.create({
          recipientId: customer._id,
          recipientType: 'customer',
          message: `กรมธรรม์รถยนต์ทะเบียน ${carReg} ของคุณ กำลังจะหมดอายุในวันที่ ${endDateStr} กรุณาต่ออายุ`,
          type: 'warning', // สีส้ม/แดง
          isRead: false,
          sender: { name: 'System', role: 'System' },
          relatedPurchaseId: policy._id
        });
      }

      // --- B. แจ้งเตือนตัวแทน (ถ้ามี) ---
      if (agent && agent._id) {
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'ลูกค้า';
        await NotificationModel.create({
          recipientId: agent._id,
          recipientType: 'agent',
          message: `แจ้งเตือน: กรมธรรม์ของลูกค้า ${customerName} (ทะเบียน ${carReg}) กำลังจะหมดอายุในวันที่ ${endDateStr}`,
          type: 'warning',
          isRead: false,
          sender: { name: 'System', role: 'System' },
          relatedPurchaseId: policy._id
        });
      }

      // --- C. อัปเดตสถานะเป็น about_to_expire ---
      policy.status = 'about_to_expire';
      await policy.save();
    }

    console.log(`✅ Successfully updated and notified ${policiesToExpire.length} policies.`);

  } catch (error) {
    console.error('❌ Error checking policies:', error);
  }
};

// ✅ 0. ฟังก์ชันอัปเดตสถานะ "ทั้งระบบ" (Global Auto Update)
const autoUpdateAllStatuses = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next60Days = new Date(today);
    next60Days.setDate(today.getDate() + 60);

    // 1. หมดอายุแล้ว (ทุก Agent)
    await PurchaseModel.updateMany(
        {
            status: { $in: ['active', 'about_to_expire'] },
            end_date: { $lt: today }
        },
        { $set: { status: 'expired' } }
    );

    // 2. ใกล้หมดอายุ (ทุก Agent)
    await PurchaseModel.updateMany(
        {
            status: 'active',
            end_date: { $gte: today, $lte: next60Days }
        },
        { $set: { status: 'about_to_expire' } }
    );

    // 3. (Optional) แก้สถานะกลับถ้ามีการเลื่อนวันที่
    await PurchaseModel.updateMany(
        {
            status: 'about_to_expire',
            end_date: { $gt: next60Days }
        },
        { $set: { status: 'active' } }
    );
};

export const startCronJobs = () => {
  // สั่งทำงานทันที 1 ครั้งเมื่อเริ่ม Server
  console.log('🚀 Server Started: Running initial policy check...');
  checkExpiringPolicies();
  // autoUpdateAllStatuses();

  // ทำงานทุกวัน เวลา 00:00 น.
  cron.schedule('0 0 * * *', () => {
    console.log('🕒 Cron Job Triggered: Running daily check...');
    checkExpiringPolicies();
    autoUpdateAllStatuses();
  });
  
  console.log('🕒 Cron Job scheduled: Running every day at 00:00');
};