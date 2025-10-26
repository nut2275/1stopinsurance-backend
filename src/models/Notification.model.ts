import mongoose, {Schema, Document} from "mongoose";

export interface Notification extends Document {
    // sender_admin_id: string;
    sender_customer_id: string;
    sender_agent_id: string;
    receiver_customer_id: string;
    receiver_agent_id: string;
    title: string;
    text: string;
    date: Date;
    type: string;
}

const NotificationSchema: Schema<Notification> = new Schema<Notification>(
    {
        //sender_admin_id: String,
        sender_customer_id: String,
        sender_agent_id: String,
        receiver_customer_id: String,
        receiver_agent_id: String,
        title: {type: String, required: true},
        text: {type: String, required: true},
        type: {type: String, required: true, default:"info"} //info, warning 
    },
    {
        timestamps: true, // ✅ เพิ่มตรงนี้ Mongoose จะสร้าง 'createdAt' และ 'updatedAt' ให้
    }
)

export default mongoose.model('Notification', NotificationSchema)