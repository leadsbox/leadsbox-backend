import { ClientSession, Model, mongoose } from '../config/db';
import { LeadDocument, LeadModel } from '../models/leads.model';
import { ProviderDocument, ProviderModel } from '../models/provider';
import { UserDocument, UserModel } from '../models/user.model';
import { DbOptions, DbResponse } from '../types/mongo';

class MongoDBService<T extends mongoose.Document> {
  private model: Model<T>;
  private session: ClientSession | null = null;

  constructor(model: Model<T>) {
    this.model = model;
  }

  private handleResponse(
    status: boolean,
    data: any = null,
    message = '',
    error: any = null
  ): DbResponse {
    return { status, data, message, error };
  }

  public async startSession(): Promise<ClientSession> {
    if (!this.session) {
      this.session = await mongoose.startSession();
    }
    return this.session;
  }

  public async commitTransaction(): Promise<void> {
    if (this.session) {
      await this.session.commitTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  public async abortTransaction(): Promise<void> {
    if (this.session) {
      await this.session.abortTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  async create(data: Partial<T>, options?: DbOptions): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      const newDocument = new this.model(data);
      const savedDoc = await newDocument.save({ session });
      return this.handleResponse(
        true,
        savedDoc,
        'Document created successfully'
      );
    } catch (error) {
      if (session) await this.abortTransaction();
      return this.handleResponse(
        false,
        null,
        'Failed to create document',
        error
      );
    }
  }

  async findById(
    id: mongoose.Types.ObjectId,
    options?: DbOptions
  ): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      const doc = await this.model.findById(id).session(session).lean().exec();
      return doc
        ? this.handleResponse(true, doc)
        : this.handleResponse(false, null, 'Document not found');
    } catch (error) {
      return this.handleResponse(
        false,
        null,
        'Failed to retrieve document',
        error
      );
    }
  }

  async findOne(query: any, options?: DbOptions): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      let queryBuilder = this.model
        .findOne(query)
        .session(session) as mongoose.Query<T | null, T>;
      if (options?.select) {
        queryBuilder = queryBuilder.select(options.select) as mongoose.Query<
          T | null,
          T
        >;
      }
      const doc = await queryBuilder.exec();
      return doc
        ? this.handleResponse(true, doc)
        : this.handleResponse(false, null, 'Document not found');
    } catch (error) {
      return this.handleResponse(
        false,
        null,
        'Failed to retrieve document',
        error
      );
    }
  }

  async findOneMongo(
    query: mongoose.FilterQuery<T>,
    options?: DbOptions
  ): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      let queryBuilder = this.model
        .findOne(query)
        .session(session) as mongoose.Query<T | null, T>;

      if (options?.select) {
        queryBuilder = queryBuilder.select(options.select) as mongoose.Query<
          T | null,
          T
        >;
      }

      const doc = await queryBuilder.exec();

      return doc
        ? this.handleResponse(true, doc, 'Document found')
        : this.handleResponse(false, null, 'Document not found');
    } catch (error) {
      return this.handleResponse(
        false,
        null,
        'Failed to retrieve document',
        error
      );
    }
  }

  async find(
    query: any = {},
    limit = 10,
    skip = 0,
    options?: DbOptions
  ): Promise<DbResponse<T[]>> {
    const session = options?.session || this.session || null;
    try {
      const docs = await this.model
        .find(query)
        .limit(limit)
        .skip(skip)
        .session(session)
        .exec();
      return this.handleResponse(
        true,
        docs,
        'Documents retrieved successfully'
      );
    } catch (error) {
      return this.handleResponse(
        false,
        [],
        'Failed to retrieve documents',
        error
      );
    }
  }

  async updateOne(
    query: any,
    updateData: Partial<T>,
    options?: DbOptions
  ): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      const updatedDoc = await this.model.findOneAndUpdate(query, updateData, {
        new: true,
        upsert: true,
        session,
      });
      return updatedDoc
        ? this.handleResponse(true, updatedDoc, 'Document updated successfully')
        : this.handleResponse(false, null, 'Failed to update document');
    } catch (error) {
      if (session) await this.abortTransaction();
      return this.handleResponse(
        false,
        null,
        'Failed to update document',
        error
      );
    }
  }

  async deleteOne(query: any, options?: DbOptions): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      const deletedDoc = await this.model
        .findOneAndDelete(query)
        .session(session)
        .exec();
      return deletedDoc
        ? this.handleResponse(true, deletedDoc, 'Document deleted successfully')
        : this.handleResponse(false, null, 'Failed to delete document');
    } catch (error) {
      if (session) await this.abortTransaction();
      return this.handleResponse(
        false,
        null,
        'Failed to delete document',
        error
      );
    }
  }

  async deleteMany(query: any, options?: DbOptions): Promise<DbResponse<T>> {
    const session = options?.session || this.session || null;
    try {
      const result = await this.model.deleteMany(query).session(session).exec();
      return result.deletedCount > 0
        ? this.handleResponse(
            true,
            result,
            `${result.deletedCount} documents deleted successfully`
          )
        : this.handleResponse(false, null, 'No documents found to delete');
    } catch (error) {
      if (session) await this.abortTransaction();
      return this.handleResponse(
        false,
        null,
        'Failed to delete documents',
        error
      );
    }
  }
}

export const mongoUserService = new MongoDBService<UserDocument>(UserModel);
export const mongoLeadService = new MongoDBService<LeadDocument>(LeadModel);
export const mongoProviderService = new MongoDBService<ProviderDocument>(
  ProviderModel
);
