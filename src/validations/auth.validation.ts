import Joi from 'joi';
import joiDate from '@joi/date';
import { StatusCode } from '../types/response';

const joi = Joi.extend(joiDate);

const reservedWords = ['admin', 'support', 'null'];

const AuthValidations = {
  async register(payload: any) {
    if (!payload.username && payload.email) {
      const emailName = payload.email.split('@')[0];
      const baseUsername = emailName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      const randomSuffix = Math.random().toString(36).substring(2, 6);
      payload.username = `${baseUsername}${randomSuffix}`;

      console.log('Generated username:', payload.username);
    }
    const schema = joi.object({
      username: joi
        .string()
        .min(1)
        .max(30)
        .regex(/^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]+$/)
        .invalid(...reservedWords)
        .required()
        .messages({
          'string.pattern.base':
            'Username can only contain letters, numbers, underscores, and periods. It cannot end with a period or have consecutive periods.',
          'string.min': 'Username must be at least 1 character long.',
          'string.max': 'Username must not exceed 30 characters.',
          'any.invalid': 'Username cannot be a reserved word.',
          'any.required': 'Username is required!',
        }),

      email: joi.string().email().required().messages({
        'string.email': 'Invalid email format.',
        'any.required': 'Email is required!',
      }),

      password: joi.string().min(8).max(30).required().messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.max': 'Password must not exceed 30 characters.',
        'any.required': 'Password is required!',
      }),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },

  async login(payload: any) {
    const schema = joi.object({
      identifier: joi
        .alternatives()
        .try(
          joi
            .string()
            .email()
            .messages({ 'string.email': 'Invalid email format.' }),
          joi
            .string()
            .min(1)
            .max(30)
            .regex(/^(?!\.)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]+$/)
            .messages({
              'string.pattern.base':
                'Username can only contain letters, numbers, underscores, and periods. It cannot start or end with a period or contain consecutive periods.',
              'string.min': 'Username must be at least 1 character long.',
              'string.max': 'Username must not exceed 30 characters.',
            })
        )
        .required()
        .messages({
          'any.required': 'Username or email is required!',
        }),

      password: joi.string().required().messages({
        'any.required': 'Password is required!',
      }),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }

    return true;
  },

  async forgotPassword(payload: any) {
    const schema = joi.object({
      email: joi.string().email().required().messages({
        'string.email': 'Invalid email format.',
        'any.required': 'Email is required!',
      }),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },

  async resetPassword(payload: any) {
    const schema = Joi.object({
      token: Joi.string()
        .required()
        .messages({ 'any.required': 'Token is required!' }),
      newPassword: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters long.',
        'any.required': 'New password is required!',
      }),
    });

    const { error } = schema.validate(payload);
    if (error) {
      return error.details[0].message;
    }
    return true;
  },
};

export default AuthValidations;
