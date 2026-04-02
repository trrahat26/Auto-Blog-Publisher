import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import schedulerRouter from "./scheduler";
import logsRouter from "./logs";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(schedulerRouter);
router.use(logsRouter);
router.use(settingsRouter);

export default router;
