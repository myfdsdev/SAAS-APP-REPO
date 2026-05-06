import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
    },
    start_time: {
      type: String,
      required: true,
      default: '09:00',
    },
    end_time: {
      type: String,
      required: true,
      default: '18:00',
    },
    created_by: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

shiftSchema.index({ company_id: 1, name: 1 }, { unique: true });

export default mongoose.model('Shift', shiftSchema);
