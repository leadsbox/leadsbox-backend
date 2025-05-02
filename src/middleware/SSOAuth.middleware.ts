import { RequestHandler } from 'express';

const SSOAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    next();      
    return;      
  }

  res.status(401).json({ message: 'User Not logged in' });
  return;
};

export default SSOAuth;
