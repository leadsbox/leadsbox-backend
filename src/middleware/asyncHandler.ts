export const asyncHandler = (fn: Function) => {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};
