import Joi from 'joi';
import { StatusCode } from '../types/response';

const OrgValidations = {
  async createOrg(payload: any) {
    const schema = Joi.object({
      name: Joi.string().trim().required().messages({
        'string.empty': 'Organization name is required',
        'any.required': 'Organization name is required',
      }),
      description: Joi.string().trim().optional(),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },

  async updateOrg(payload: any) {
    const schema = Joi.object({
      name: Joi.string().trim().min(1).messages({
        'string.empty': 'Name cannot be empty',
      }),
      description: Joi.string().trim().optional(),
      logoUrl: Joi.string().uri().messages({
        'string.uri': 'Invalid logo URL',
      }),
    }).min(1); // At least one field is required for update

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },

  async bankAccount(payload: any) {
    const schema = Joi.object({
      bankName: Joi.string().trim().required().messages({
        'string.empty': 'Bank name is required',
        'any.required': 'Bank name is required',
      }),
      accountName: Joi.string().trim().required().messages({
        'string.empty': 'Account name is required',
        'any.required': 'Account name is required',
      }),
      accountNumber: Joi.string().trim().required().messages({
        'string.empty': 'Account number is required',
        'any.required': 'Account number is required',
      }),
      isDefault: Joi.boolean().optional(),
      notes: Joi.string().trim().optional(),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },
};

export default OrgValidations;
