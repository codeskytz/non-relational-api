import Joi from 'joi';

/**
 * Validation middleware for API requests
 */

// Payment link generation validation schema
export const validatePaymentLinkGeneration = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().positive().min(0.01).max(999999.99).required()
      .messages({
        'number.positive': 'Amount must be greater than 0',
        'number.min': 'Amount must be at least 0.01',
        'number.max': 'Amount cannot exceed 999,999.99',
        'any.required': 'Amount is required'
      }),
    description: Joi.string().min(3).max(255).required()
      .messages({
        'string.min': 'Description must be at least 3 characters long',
        'string.max': 'Description cannot exceed 255 characters',
        'any.required': 'Description is required'
      }),
    customerName: Joi.string().min(2).max(255).optional()
      .messages({
        'string.min': 'Customer name must be at least 2 characters long',
        'string.max': 'Customer name cannot exceed 255 characters'
      }),
    customerEmail: Joi.string().email().max(255).optional()
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': 'Email cannot exceed 255 characters'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAIL',
      details: errors
    });
  }

  next();
};

// Payment processing validation schema
export const validatePaymentProcessing = (req, res, next) => {
  const schema = Joi.object({
    paymentLinkId: Joi.string().uuid().required()
      .messages({
        'string.uuid': 'Payment link ID must be a valid UUID',
        'any.required': 'Payment link ID is required'
      }),
    phoneNumber: Joi.string().pattern(/^0[0-9]{9}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be in format 0XXXXXXXXX (Tanzania local format)',
        'any.required': 'Phone number is required'
      }),
    customerName: Joi.string().min(2).max(255).required()
      .messages({
        'string.min': 'Customer name must be at least 2 characters long',
        'string.max': 'Customer name cannot exceed 255 characters',
        'any.required': 'Customer name is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAIL',
      details: errors
    });
  }

  next();
};

// Todo creation validation schema
export const validateTodoCreation = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(255).required()
      .messages({
        'string.min': 'Title cannot be empty',
        'string.max': 'Title cannot exceed 255 characters',
        'any.required': 'Title is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAIL',
      details: errors
    });
  }

  next();
};

// Todo status update validation schema
export const validateTodoStatusUpdate = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid('done', 'not yet').required()
      .messages({
        'any.only': 'Status must be either "done" or "not yet"',
        'any.required': 'Status is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAIL',
      details: errors
    });
  }

  next();
};

export default {
  validatePaymentLinkGeneration,
  validatePaymentProcessing,
  validateTodoCreation,
  validateTodoStatusUpdate
};