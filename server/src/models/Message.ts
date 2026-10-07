import mongoose from 'mongoose';
import { Message } from '../types/index.js';

const messageSchema = new mongoose.Schema<Message>(
  {
    sender: { type: String, required: true },
    senderId: { type: String },
    content: { type: String, required: true, maxlength: 5000 },
    room: { type: String, default: 'general' },
    to: { type: String, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ to: 1 });

export default mongoose.model<Message>('Message', messageSchema);
