import express from "express";
import indexRouter from "./routes/authRoutes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", indexRouter);

export default app;
