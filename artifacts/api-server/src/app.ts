import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

db.select().from(settingsTable).limit(1).then((rows) => {
  const settings = rows[0];
  if (!settings || settings.schedulerEnabled) {
    startScheduler(settings?.postsPerDay ?? 2);
    logger.info("Scheduler auto-started on boot");
  }
}).catch((err) => {
  logger.warn({ err }, "Could not load scheduler settings on boot");
});

export default app;
