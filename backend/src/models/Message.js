import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    filename: { type: String, default: '' },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    public_id: { type: String, default: '' },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sender_email: { type: String, required: true },
    sender_name: { type: String, required: true },
    receiver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver_email: { type: String, required: true },
    receiver_name: { type: String, required: true },
    message_text: { type: String, default: '' },
    attachments: [attachmentSchema],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    is_read: { type: Boolean, default: false },
    is_edited: { type: Boolean, default: false },
    edited_at: { type: Date },
    is_pinned: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    deleted_for_everyone: { type: Boolean, default: false },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    muted_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attachment_url: { type: String, default: '' },
    attachment_type: { type: String, default: '' },
}, { timestamps: true });

// Index for faster chat queries between two users
messageSchema.index({ company_id: 1, sender_id: 1, receiver_id: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
