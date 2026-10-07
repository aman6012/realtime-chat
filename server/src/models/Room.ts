import mongoose from 'mongoose';
import { Room } from '../types/index.js';

const roomSchema = new mongoose.Schema<Room>(
  {
    name: { type: String, required: true, unique: true, minlength: 1, maxlength: 50 },
    description: { type: String, maxlength: 500 },
    createdBy: { type: String, required: true },
    members: [{ type: String }],
  },
  { timestamps: true }
);

roomSchema.index({ name: 1 });
roomSchema.index({ members: 1 });

export default mongoose.model<Room>('Room', roomSchema);
