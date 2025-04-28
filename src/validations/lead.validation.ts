import Joi from 'joi';
import joiDate from '@joi/date';
import { StatusCode } from '../types/response';
import { UserProvider } from '../types';

const joi = Joi.extend(joiDate);

const LeadValidations = {
  async updateTag(payload: any) {
    const schema = joi.object({
      conversationId: joi.string().required().messages({
        'any.required': 'Conversation ID is required!',
      }),
      tag: joi.string().required().messages({
        'any.required': 'Tag is required!',
      }),
      provider: joi
        .string()
        .valid(Object.values(UserProvider))
        .required()
        .messages({
          'any.required': 'Provider is required!',
          'any.only': 'Provider must be one of the following values: ${values}',
        }),
      providerId: joi.string().required().messages({
        'any.required': 'Provider ID is required!',
      }),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },
};

export default LeadValidations;
