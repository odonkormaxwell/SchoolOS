import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import schoolRouter from "./school";
import peopleRouter from "./people";
import academicRouter from "./academic";
import feesRouter from "./fees";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(schoolRouter);
router.use(peopleRouter);
router.use(academicRouter);
router.use(feesRouter);
router.use(reportsRouter);

export default router;
