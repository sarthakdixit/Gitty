import express, { Request, Response, NextFunction } from "express";
import indexRouter from "./routes/authRoutes";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(
    `[Request Logger] Incoming request: ${req.method} ${req.originalUrl}`
  );
  next();
});

app.use("/api/auth", indexRouter);

app.use(errorHandler);

export default app;
