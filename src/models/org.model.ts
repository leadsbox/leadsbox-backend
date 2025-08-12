import { Schema, model, Document, Types } from 'mongoose';

interface IOrg extends Document {
  name: string;
  owner: Types.ObjectId;
}

const OrgSchema = new Schema<IOrg>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Org = model<IOrg>('Org', OrgSchema);

export default Org;
