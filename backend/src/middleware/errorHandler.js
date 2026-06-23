export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, next) => {
  if (error.code === "P2002") {
    return res.status(409).json({ message: "This record already exists. Please try again." });
  }

  const status = error.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === "production";

  res.status(status).json({
    message: status === 500 ? "Something went wrong" : error.message,
    details: isProduction ? undefined : error.message,
  });
};
