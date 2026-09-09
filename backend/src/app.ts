import express from "express";
import cors from "cors";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
