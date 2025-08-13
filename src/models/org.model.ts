import { Schema, model, Document, Types } from 'mongoose';

export interface IBankAccount {
  _id?: Types.ObjectId;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  notes?: string;
}

export interface IOrgMember {
  user: Types.ObjectId;
  role: 'admin' | 'member';
  addedAt: Date;
}

export interface IOrg extends Document {
  name: string;
  owner: Types.ObjectId;
  description?: string;
  logoUrl?: string;
  bankAccounts: IBankAccount[];
  members: IOrgMember[];
  isActive: boolean;
  settings: {
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>({
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  notes: String
});

const OrgMemberSchema = new Schema<IOrgMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  addedAt: { type: Date, default: Date.now }
});

const OrgSchema = new Schema<IOrg>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    owner: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    logoUrl: String,
    bankAccounts: [BankAccountSchema],
    members: [OrgMemberSchema],
    isActive: { 
      type: Boolean, 
      default: true 
    },
    settings: {
      currency: { 
        type: String, 
        default: 'NGN',
        uppercase: true,
        trim: true
      },
      timezone: { 
        type: String, 
        default: 'Africa/Lagos'
      },
      dateFormat: { 
        type: String, 
        default: 'DD/MM/YYYY'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
OrgSchema.index({ name: 'text', description: 'text' });
OrgSchema.index({ owner: 1 });
OrgSchema.index({ 'members.user': 1 });

// Ensure only one default bank account per org
OrgSchema.pre('save', function(next) {
  if (this.isModified('bankAccounts')) {
    const defaultBanks = this.bankAccounts.filter(acc => acc.isDefault);
    if (defaultBanks.length > 1) {
      throw new Error('Only one default bank account is allowed per organization');
    }
  }
  next();
});

const Org = model<IOrg>('Org', OrgSchema);

export default Org;
