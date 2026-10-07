import mongoose from 'mongoose';
import { User } from '../types/index.js';

const userSchema = new mongoose.Schema<User>(
  {
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    socketId: { type: String },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ online: 1 });

export default mongoose.model<User>('User', userSchema);
