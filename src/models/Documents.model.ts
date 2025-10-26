import mongoose,{ Document, Schema} from 'mongoose'

export interface Documents extends Document{
    customer_id: string;
    agent_id: string;
    purchase_id: string;
    file_url: string;
}

const DocumentSchema: Schema<Documents> = new Schema<Documents>(
    {
        customer_id: {type:String},
        agent_id: {type: String},
        purchase_id: {type: String},
        file_url: {type:String, required: true}
    },
    {
        timestamps: true, // เพิ่ม createdAt และ updatedAt ให้อัตโนมัติ
    }
)

export default mongoose.model<Documents>('Document', DocumentSchema)